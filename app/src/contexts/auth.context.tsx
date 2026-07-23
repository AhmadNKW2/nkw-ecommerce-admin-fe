/**
 * Auth Context for managing authentication state
 * Supports cookie-based auth, session management, activity monitoring, and cross-tab sync
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { authService } from "../services/auth/api/auth.service";
import { LoginRequest, User, AuthState, SessionInfo } from "../services/auth/types/auth.types";
import { httpClient } from "../lib/api/http-client";
import { sessionManager, sessionStorageManager } from "../lib/session/session-manager";
import { showSuccessToast, showInfoToast, showErrorToast } from "../lib/toast";
import {
  registerAdminClientDevice,
  resetAdminClientDeviceRegistration,
} from "../lib/register-admin-client-device";
import { isAuthRoute } from "../lib/auth-routes";

// Session configuration
const SESSION_CONFIG = {
  // Warning before expiration (5 minutes)
  warningBeforeExpiry: 5 * 60 * 1000,
  // Activity check interval (1 minute)
  activityCheckInterval: 60 * 1000,
  // Session refresh threshold (when less than 2 minutes remaining)
  refreshThreshold: 2 * 60 * 1000,
  // Inactivity timeout for non-rememberMe sessions (30 minutes)
  inactivityTimeout: 30 * 60 * 1000,
  // Minimum gap between successful refreshes (prevents refresh storms)
  minRefreshInterval: 30 * 1000,
  // Fallback access-token lifetime when API omits expires_in
  defaultExpiresInMs: 60 * 60 * 1000,
} as const;

function decodeJwtExpMs(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return payload.exp && payload.exp > 0 ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function resolveExpiresAt(expiresIn: unknown, accessToken?: string): number {
  if (
    typeof expiresIn === "number" &&
    Number.isFinite(expiresIn) &&
    expiresIn > 0
  ) {
    return Date.now() + expiresIn * 1000;
  }
  if (accessToken) {
    const fromJwt = decodeJwtExpMs(accessToken);
    if (fromJwt) return fromJwt;
  }
  return Date.now() + SESSION_CONFIG.defaultExpiresInMs;
}

interface SessionWarning {
  show: boolean;
  expiresAt: number;
  timeRemaining: number;
}

interface AuthContextType extends Omit<AuthState, 'sessionExpiresAt'> {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  extendSession: () => Promise<void>;
  sessionWarning: SessionWarning | null;
  dismissSessionWarning: () => void;
  isAdmin: boolean;
  hasAdminAccess: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  // Pre-load user from localStorage so role is available synchronously before /auth/profile responds
  const cachedUser = typeof window !== 'undefined' ? sessionStorageManager.getUser<User>() : null;
  const [authState, setAuthState] = useState<AuthState>({
    user: cachedUser,
    isAuthenticated: false,
    isLoading: true,
    sessionExpiresAt: null,
  });
  const [sessionWarning, setSessionWarning] = useState<SessionWarning | null>(null);
  
  // Refs for intervals and cleanup
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isLoggingOutRef = useRef<boolean>(false);
  const isAuthenticatedRef = useRef<boolean>(false);
  const handleLogoutRef = useRef<(callApi?: boolean) => Promise<void>>(async () => {});
  const lastRefreshAtRef = useRef<number>(0);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    isAuthenticatedRef.current = authState.isAuthenticated;
  }, [authState.isAuthenticated]);

  // Clear all intervals
  const clearIntervals = useCallback(() => {
    if (sessionCheckIntervalRef.current) {
      clearInterval(sessionCheckIntervalRef.current);
      sessionCheckIntervalRef.current = null;
    }
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
  }, []);

  // Refresh the session token (single-flight + throttled)
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    if (
      Date.now() - lastRefreshAtRef.current < SESSION_CONFIG.minRefreshInterval
    ) {
      return true;
    }

    refreshInFlightRef.current = (async () => {
      try {
        const response = await authService.refreshToken();
        if (response.success && response.data) {
          if (response.data.access_token) {
            httpClient.setAuthToken(response.data.access_token);
          }
          const expiresAt = resolveExpiresAt(
            response.data.expires_in,
            response.data.access_token,
          );

          // Prefer expiry already written by httpClient (same refresh call).
          const existing = sessionManager.getSessionInfo();
          const safeExpiresAt =
            existing?.expiresAt && existing.expiresAt > Date.now() + 60_000
              ? existing.expiresAt
              : expiresAt;

          sessionManager.setSessionInfo({
            ...(existing ?? { rememberMe: false }),
            expiresAt: safeExpiresAt,
            lastActivity: Date.now(),
          });

          setAuthState((prev) => ({
            ...prev,
            sessionExpiresAt: safeExpiresAt,
          }));

          lastRefreshAtRef.current = Date.now();
          return true;
        }
        return false;
      } catch (error) {
        // refreshToken call itself can throw when the httpClient triggers its own
        // logout/redirect flow on a 401 from /auth/refresh. Swallow the error here
        // so we simply return false and let the caller decide what to do.
        console.error("Session refresh failed:", error);
        return false;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    return refreshInFlightRef.current;
  }, []);

  // Check session and show warning if needed
  const checkSession = useCallback(async () => {
    const sessionInfo = sessionManager.getSessionInfo();
    if (!sessionInfo || !isAuthenticatedRef.current) return;
    
    const now = Date.now();
    const timeUntilExpiry = sessionInfo.expiresAt - now;
    
    // Check for inactivity (only for non-rememberMe sessions)
    if (!sessionInfo.rememberMe) {
      const timeSinceActivity = now - lastActivityRef.current;
      if (timeSinceActivity > SESSION_CONFIG.inactivityTimeout) {
        // Session expired due to inactivity
        showInfoToast('Your session has expired due to inactivity');
        await handleLogoutRef.current(false);
        return;
      }
    }
    
    // Show warning if session expiring soon
    if (timeUntilExpiry <= SESSION_CONFIG.warningBeforeExpiry && timeUntilExpiry > 0) {
      setSessionWarning({
        show: true,
        expiresAt: sessionInfo.expiresAt,
        timeRemaining: timeUntilExpiry,
      });
      
      // Start countdown interval
      if (!warningIntervalRef.current) {
        warningIntervalRef.current = setInterval(() => {
          setSessionWarning(prev => {
            if (!prev) return null;
            const remaining = prev.expiresAt - Date.now();
            if (remaining <= 0) {
              clearInterval(warningIntervalRef.current!);
              warningIntervalRef.current = null;
              return null;
            }
            return { ...prev, timeRemaining: remaining };
          });
        }, 1000);
      }
    }
    
    // Session expired — try to silently refresh before giving up.
    // The refresh token may still be valid even though the localStorage expiry
    // has passed (e.g. after a browser tab restore or a silent token renewal
    // that didn't update localStorage).
    if (timeUntilExpiry <= 0) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        showInfoToast('Your session has expired');
        await handleLogoutRef.current(false);
      }
      return;
    }
    
    // Proactively refresh whenever we are within the refresh threshold.
    // We intentionally skip the "has recent activity" guard: the refresh
    // token is valid regardless of whether the user moved their mouse, and
    // letting the access token expire due to inactivity causes unnecessary
    // logouts on the next page interaction or page refresh.
    if (timeUntilExpiry <= SESSION_CONFIG.refreshThreshold) {
      await refreshSession();
    }
  }, [refreshSession]);

  // Handle logout
  const handleLogout = useCallback(async (callApi: boolean = true) => {
    clearIntervals();
    setSessionWarning(null);
    
    try {
      if (callApi) {
        await authService.logout();
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      resetAdminClientDeviceRegistration();
      sessionManager.clearSession(); // also removes auth_user from localStorage
      httpClient.removeAuthToken();
      sessionManager.broadcastEvent({ type: 'logout', timestamp: Date.now() });

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionExpiresAt: null,
      });

      // Only redirect if not already on login page
      if (typeof window !== 'undefined' && !isAuthRoute(window.location.pathname)) {
        router.push("/login");
      }
    }
  }, [router, clearIntervals]);

  useEffect(() => {
    handleLogoutRef.current = handleLogout;
  }, [handleLogout]);

  // Extend session (called when user clicks "Stay logged in")
  const extendSession = useCallback(async () => {
    setSessionWarning(null);
    clearIntervals();
    
    const success = await refreshSession();
    if (success) {
      showSuccessToast('Session extended successfully');
      // Restart session checking
      sessionCheckIntervalRef.current = setInterval(checkSession, SESSION_CONFIG.activityCheckInterval);
    } else {
      // Refresh failed — the httpClient already handles the redirect to /login
      // when the /auth/refresh endpoint returns a non-OK status (it calls
      // notifyAuthStateChange(false) and does window.location.href = "/login").
      // We must NOT call handleLogout here to avoid a double-redirect race.
      showInfoToast('Could not extend session. Please log in again.');
    }
  }, [refreshSession, checkSession, clearIntervals]);

  // Dismiss session warning without extending
  const dismissSessionWarning = useCallback(() => {
    setSessionWarning(null);
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
      warningIntervalRef.current = null;
    }
  }, []);

  // Handle activity for session tracking
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      
      // Update session info
      const sessionInfo = sessionManager.getSessionInfo();
      if (sessionInfo) {
        sessionManager.setSessionInfo({
          ...sessionInfo,
          lastActivity: Date.now(),
        });
      }
      
      // Broadcast activity to other tabs
      sessionManager.broadcastEvent({ type: 'activity', timestamp: Date.now() });
    };

    // Throttle activity updates
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledActivity = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        handleActivity();
        throttleTimeout = null;
      }, 5000); // Throttle to once every 5 seconds
    };

    window.addEventListener('mousemove', throttledActivity);
    window.addEventListener('keydown', throttledActivity);
    window.addEventListener('click', throttledActivity);
    window.addEventListener('scroll', throttledActivity);

    return () => {
      window.removeEventListener('mousemove', throttledActivity);
      window.removeEventListener('keydown', throttledActivity);
      window.removeEventListener('click', throttledActivity);
      window.removeEventListener('scroll', throttledActivity);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, []);

  // When returning to this tab, refresh only if the access token is near expiry.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      lastActivityRef.current = Date.now();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!isAuthenticatedRef.current) return;
        const sessionInfo = sessionManager.getSessionInfo();
        const timeUntilExpiry = sessionInfo
          ? sessionInfo.expiresAt - Date.now()
          : 0;
        if (timeUntilExpiry > SESSION_CONFIG.refreshThreshold) return;
        void refreshSession();
      }, 300);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [refreshSession]);

  // Initialize auth state and set up cross-tab sync
  useEffect(() => {
    const initAuth = async () => {
      // Skip validation if on login page to prevent infinite loop
      if (typeof window !== 'undefined' && isAuthRoute(window.location.pathname)) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionExpiresAt: null,
        });
        return;
      }

      try {
        // Validate existing session via /auth/profile.
        // If it fails (e.g., access token expired), try a one-time silent refresh then validate again.
        const firstCheck = await authService.validateSession();

        let finalCheck = firstCheck;
        if (!firstCheck.valid) {
          const refreshed = await refreshSession();
          if (refreshed) {
            finalCheck = await authService.validateSession();
          }
        }

        if (finalCheck.valid && finalCheck.user) {
          let sessionInfo = sessionManager.getSessionInfo();

          // The httpClient may have silently refreshed the access token internally
          // (as part of handling the 401 on /auth/profile) without calling the
          // auth-context's refreshSession(), which means localStorage still holds
          // the OLD expiresAt from the original login.  If that timestamp is already
          // in the past (or within 60 s), call refreshSession() explicitly so that
          // localStorage gets an up-to-date expiry and the checkSession interval
          // does not immediately fire a logout.
          if (!sessionInfo || sessionInfo.expiresAt - Date.now() < 60 * 1000) {
            await refreshSession();
            sessionInfo = sessionManager.getSessionInfo();
          }

          const expiresAt = sessionInfo?.expiresAt || Date.now() + 30 * 60 * 1000;

          // Persist user so role is available synchronously on next page load
          sessionStorageManager.saveUser(finalCheck.user);

          setAuthState({
            user: finalCheck.user,
            isAuthenticated: true,
            isLoading: false,
            sessionExpiresAt: expiresAt,
          });

          void registerAdminClientDevice("admin_fe");

          // Start session checking
          sessionCheckIntervalRef.current = setInterval(checkSession, SESSION_CONFIG.activityCheckInterval);
        } else {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            sessionExpiresAt: null,
          });
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionExpiresAt: null,
        });
      }
    };

    initAuth();

    // Set up cross-tab event listener
    const unsubscribe = sessionManager.onSessionEvent((event) => {
      switch (event.type) {
        case 'logout':
          // Another tab logged out
          clearIntervals();
          setSessionWarning(null);
          sessionManager.clearSession();
          httpClient.removeAuthToken();
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            sessionExpiresAt: null,
          });
          // Only redirect if not already on login page
          if (typeof window !== 'undefined' && !isAuthRoute(window.location.pathname)) {
            router.push('/login');
          }
          break;
        case 'login':
          // Another tab logged in - refresh our state
          initAuth();
          break;
        case 'session_refresh':
          // Another tab refreshed — cookies are fresh; drop stale Bearer header.
          httpClient.removeAuthToken();
          const sessionInfo = sessionManager.getSessionInfo();
          if (sessionInfo) {
            setAuthState(prev => ({
              ...prev,
              sessionExpiresAt: sessionInfo.expiresAt,
            }));
          }
          break;
        case 'activity':
          // Another tab had activity - update our last activity
          lastActivityRef.current = event.timestamp;
          break;
      }
    });

    // Subscribe to HTTP client auth state changes
    const unsubscribeHttp = httpClient.onAuthStateChange((isAuthenticated) => {
      if (!isAuthenticated) {
        // HTTP client detected auth failure.
        // Guard against re-entrant calls: if a logout is already in progress
        // (e.g. extendSession already handled the failure), do nothing.
        if (isLoggingOutRef.current) return;

        // Don't logout if already on login page
        if (typeof window !== 'undefined' && !isAuthRoute(window.location.pathname)) {
          isLoggingOutRef.current = true;
          handleLogoutRef.current(false).finally(() => {
            isLoggingOutRef.current = false;
          });
        } else {
          // Just update state without redirect
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            sessionExpiresAt: null,
          });
        }
      }
    });

    return () => {
      unsubscribe();
      unsubscribeHttp();
      clearIntervals();
    };
    // Mount once — logout/refresh/checkSession are accessed via stable refs/callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login handler
  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);

      if (response.success && response.data) {
        const { user, expires_in, access_token } = response.data;
        if (access_token) {
          httpClient.setAuthToken(access_token);
        }
        const expiresAt = resolveExpiresAt(expires_in, access_token);

        // Store session info
        sessionManager.setSessionInfo({
          expiresAt,
          lastActivity: Date.now(),
          rememberMe: credentials.rememberMe || false,
        });

        // Persist user so role is available synchronously on next page load
        sessionStorageManager.saveUser(user);

        // Update state
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          sessionExpiresAt: expiresAt,
        });

        // Broadcast login to other tabs
        sessionManager.broadcastEvent({ type: 'login', timestamp: Date.now() });

        showSuccessToast("Login successful");

        void registerAdminClientDevice("admin_fe");

        // Start session checking
        sessionCheckIntervalRef.current = setInterval(checkSession, SESSION_CONFIG.activityCheckInterval);

        // Redirect to intended URL or dashboard
        const intendedUrl = sessionManager.getIntendedUrl();
        sessionManager.clearIntendedUrl();
        router.push(intendedUrl || "/");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      const errorMessage = error?.response?.data?.message || error?.message || "Login failed. Please check your credentials.";
      showErrorToast(errorMessage);
      throw error;
    }
  }, [router, checkSession]);

  // Logout handler
  const logout = useCallback(async () => {
    await handleLogout(true);
  }, [handleLogout]);

  const isAdmin = authState.user?.role === 'admin' || authState.user?.role === 'constant_token_admin';
  const hasAdminAccess = isAdmin;

  return (
    <AuthContext.Provider 
      value={{ 
        ...authState,
        login, 
        logout, 
        refreshSession,
        extendSession,
        sessionWarning,
        dismissSessionWarning,
        isAdmin,
        hasAdminAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
