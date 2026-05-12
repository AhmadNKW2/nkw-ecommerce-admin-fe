/**
 * Session Manager - Handles session storage, cross-tab sync, and activity monitoring
 */

import { SessionInfo, SessionEvent, SessionEventType } from "../../services/auth/types/auth.types";

// Storage keys
const STORAGE_KEYS = {
  SESSION_INFO: "session_info",
  USER_DATA: "auth_user",
  REDIRECT_URL: "auth_redirect_url",
  FORM_STATE: "form_state_backup",
  SESSION_CHANNEL: "auth_session_channel",
} as const;

// Session configuration
export const SESSION_CONFIG = {
  INACTIVITY_WARNING_MS: 2 * 60 * 1000, // 2 minutes before expiry - show warning
  ACTIVITY_CHECK_INTERVAL_MS: 30 * 1000, // Check activity every 30 seconds
  TOKEN_REFRESH_BUFFER_MS: 2 * 60 * 1000, // Refresh token 2 minutes before expiry
  DEFAULT_SESSION_DURATION_MS: 60 * 60 * 1000, // 60 minutes default
  REMEMBER_ME_DURATION_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

/**
 * Session Storage Manager
 */
export const sessionStorageManager = {
  /**
   * Save session info
   */
  saveSession(info: SessionInfo): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_INFO, JSON.stringify(info));
    } catch (error) {
      console.error("Failed to save session info:", error);
    }
  },

  /**
   * Get session info
   */
  getSession(): SessionInfo | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION_INFO);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get session info:", error);
      return null;
    }
  },

  /**
   * Clear session info
   */
  clearSession(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_INFO);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  },

  /**
   * Save user data
   */
  saveUser(user: unknown): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } catch (error) {
      console.error("Failed to save user data:", error);
    }
  },

  /**
   * Get user data
   */
  getUser<T>(): T | null {
    if (typeof window === "undefined") return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to get user data:", error);
      return null;
    }
  },

  /**
   * Save redirect URL for post-login redirect
   */
  saveRedirectUrl(url: string): void {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(STORAGE_KEYS.REDIRECT_URL, url);
    } catch (error) {
      // sessionStorage might not be available
      console.error("Failed to save redirect URL:", error);
    }
  },

  /**
   * Get and clear redirect URL
   */
  getAndClearRedirectUrl(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const url = window.sessionStorage.getItem(STORAGE_KEYS.REDIRECT_URL);
      if (url) {
        window.sessionStorage.removeItem(STORAGE_KEYS.REDIRECT_URL);
      }
      return url;
    } catch (error) {
      console.error("Failed to get redirect URL:", error);
      return null;
    }
  },

  /**
   * Backup form state before session expires
   */
  backupFormState(formId: string, data: unknown): void {
    if (typeof window === "undefined") return;
    try {
      const existingBackups = this.getFormBackups();
      existingBackups[formId] = {
        data,
        timestamp: Date.now(),
      };
      window.sessionStorage.setItem(
        STORAGE_KEYS.FORM_STATE,
        JSON.stringify(existingBackups)
      );
    } catch (error) {
      console.error("Failed to backup form state:", error);
    }
  },

  /**
   * Get form backups
   */
  getFormBackups(): Record<string, { data: unknown; timestamp: number }> {
    if (typeof window === "undefined") return {};
    try {
      const data = window.sessionStorage.getItem(STORAGE_KEYS.FORM_STATE);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      return {};
    }
  },

  /**
   * Restore form state
   */
  restoreFormState<T>(formId: string): T | null {
    const backups = this.getFormBackups();
    const backup = backups[formId];
    if (backup) {
      // Clear this specific backup after restoring
      delete backups[formId];
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          STORAGE_KEYS.FORM_STATE,
          JSON.stringify(backups)
        );
      }
      return backup.data as T;
    }
    return null;
  },

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      this.saveSession(session);
    }
  },

  /**
   * Check if session is about to expire
   */
  isSessionExpiringSoon(): boolean {
    const session = this.getSession();
    if (!session) return false;
    const timeUntilExpiry = session.expiresAt - Date.now();
    return timeUntilExpiry <= SESSION_CONFIG.INACTIVITY_WARNING_MS && timeUntilExpiry > 0;
  },

  /**
   * Check if session has expired
   */
  isSessionExpired(): boolean {
    const session = this.getSession();
    if (!session) return true;
    return Date.now() >= session.expiresAt;
  },

  /**
   * Get time until session expires (in milliseconds)
   */
  getTimeUntilExpiry(): number {
    const session = this.getSession();
    if (!session) return 0;
    return Math.max(0, session.expiresAt - Date.now());
  },
};

/**
 * Cross-Tab Session Synchronization
 */
class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<SessionEventType, Set<(event: SessionEvent) => void>> = new Map();

  constructor() {
    this.initializeSync();
  }

  private initializeSync(): void {
    if (typeof window === "undefined") return;

    const win = window as Window;
    
    // Try BroadcastChannel first (modern browsers)
    if ("BroadcastChannel" in win) {
      this.channel = new BroadcastChannel(STORAGE_KEYS.SESSION_CHANNEL);
      this.channel.onmessage = (event) => this.handleMessage(event.data);
    } else {
      // Fallback to localStorage events for older browsers
      const handleStorageEvent = (event: StorageEvent) => {
        if (event.key === STORAGE_KEYS.SESSION_CHANNEL && event.newValue) {
          try {
            const sessionEvent = JSON.parse(event.newValue);
            this.handleMessage(sessionEvent);
          } catch (error) {
            console.error("Failed to parse session event:", error);
          }
        }
      };
      win.addEventListener("storage", handleStorageEvent);
    }
  }

  private handleMessage(event: SessionEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }

  /**
   * Broadcast a session event to all tabs
   */
  broadcast(type: SessionEventType, data?: unknown): void {
    const event: SessionEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    if (this.channel) {
      this.channel.postMessage(event);
    } else if (typeof window !== "undefined") {
      // Fallback: Use localStorage
      localStorage.setItem(STORAGE_KEYS.SESSION_CHANNEL, JSON.stringify(event));
      // Clean up immediately
      localStorage.removeItem(STORAGE_KEYS.SESSION_CHANNEL);
    }
  }

  /**
   * Subscribe to session events
   */
  subscribe(type: SessionEventType, handler: (event: SessionEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const crossTabSync = new CrossTabSync();

/**
 * Activity Monitor - Tracks user activity for session management
 */
class ActivityMonitor {
  private lastActivity: number = Date.now();
  private isMonitoring: boolean = false;
  private activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
  private debounceTimer: NodeJS.Timeout | null = null;
  private onActivityCallback: (() => void) | null = null;

  /**
   * Start monitoring user activity
   */
  start(onActivity?: () => void): void {
    if (typeof window === "undefined" || this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastActivity = Date.now();
    this.onActivityCallback = onActivity || null;

    this.activityEvents.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (typeof window === "undefined" || !this.isMonitoring) return;

    this.isMonitoring = false;
    this.onActivityCallback = null;

    this.activityEvents.forEach((event) => {
      window.removeEventListener(event, this.handleActivity);
    });

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Handle activity event (debounced)
   */
  private handleActivity = (): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.lastActivity = Date.now();
      sessionStorageManager.updateLastActivity();
      
      if (this.onActivityCallback) {
        this.onActivityCallback();
      }
    }, 1000); // Debounce activity updates to once per second
  };

  /**
   * Get time since last activity (in milliseconds)
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivity;
  }

  /**
   * Check if user has been inactive for a given duration
   */
  isInactive(durationMs: number): boolean {
    return this.getTimeSinceLastActivity() >= durationMs;
  }

  /**
   * Reset activity timestamp
   */
  resetActivity(): void {
    this.lastActivity = Date.now();
  }
}

export const activityMonitor = new ActivityMonitor();

/**
 * Token Refresh Scheduler
 */
class TokenRefreshScheduler {
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshCallback: (() => Promise<void>) | null = null;

  /**
   * Schedule a token refresh
   */
  schedule(expiresAt: number, onRefresh: () => Promise<void>): void {
    this.cancel(); // Cancel any existing schedule

    this.refreshCallback = onRefresh;
    const timeUntilRefresh = expiresAt - Date.now() - SESSION_CONFIG.TOKEN_REFRESH_BUFFER_MS;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        if (this.refreshCallback) {
          try {
            await this.refreshCallback();
          } catch (error) {
            console.error("Token refresh failed:", error);
          }
        }
      }, timeUntilRefresh);
    }
  }

  /**
   * Cancel scheduled refresh
   */
  cancel(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.refreshCallback = null;
  }
}

export const tokenRefreshScheduler = new TokenRefreshScheduler();

/**
 * Format remaining session time for display
 */
export function formatSessionTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds > 0 ? `${seconds} second${seconds !== 1 ? "s" : ""}` : ""}`.trim();
  }
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

/**
 * Unified Session Manager - Combines all session management functionality
 * This is the main export that should be used by other parts of the application
 */
class SessionManager {
  /**
   * Get session info from storage
   */
  getSessionInfo(): SessionInfo | null {
    return sessionStorageManager.getSession();
  }

  /**
   * Set session info in storage
   */
  setSessionInfo(info: SessionInfo): void {
    sessionStorageManager.saveSession(info);
  }

  /**
   * Clear all session data
   */
  clearSession(): void {
    sessionStorageManager.clearSession();
  }

  /**
   * Save intended URL for redirect after login
   */
  setIntendedUrl(url: string): void {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("intended_url", url);
      } catch (error) {
        console.error("Failed to save intended URL:", error);
      }
    }
  }

  /**
   * Get and clear intended URL
   */
  getIntendedUrl(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const url = window.sessionStorage.getItem("intended_url");
      return url;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear intended URL
   */
  clearIntendedUrl(): void {
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("intended_url");
      } catch (error) {
        console.error("Failed to clear intended URL:", error);
      }
    }
  }

  /**
   * Broadcast session event to other tabs
   */
  broadcastEvent(event: SessionEvent): void {
    crossTabSync.broadcast(event.type, event.data);
  }

  /**
   * Subscribe to session events from other tabs
   */
  onSessionEvent(handler: (event: SessionEvent) => void): () => void {
    const unsubscribers: (() => void)[] = [];
    const eventTypes: SessionEventType[] = ['logout', 'login', 'session_refresh', 'activity'];
    
    eventTypes.forEach(type => {
      const unsub = crossTabSync.subscribe(type, handler);
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Start activity monitoring
   */
  startActivityMonitor(onActivity?: () => void): void {
    activityMonitor.start(onActivity);
  }

  /**
   * Stop activity monitoring
   */
  stopActivityMonitor(): void {
    activityMonitor.stop();
  }

  /**
   * Schedule token refresh
   */
  scheduleTokenRefresh(expiresAt: number, onRefresh: () => Promise<void>): void {
    tokenRefreshScheduler.schedule(expiresAt, onRefresh);
  }

  /**
   * Cancel scheduled token refresh
   */
  cancelTokenRefresh(): void {
    tokenRefreshScheduler.cancel();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
