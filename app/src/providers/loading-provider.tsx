"use client";

/**
 * Loading Provider - Manages global loading state with NProgress
 * Automatically tracks navigation and provides manual control for API calls
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  speed: 400,
  trickleSpeed: 200,
});

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

/**
 * Simple transparent overlay to block interactions while loading
 */
const SimpleOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-white/30 transition-opacity duration-300 pointer-events-none ${
        show ? "opacity-100" : "opacity-0"
      }`} 
    />
  );
};

/**
 * Navigation tracker component - uses useSearchParams which requires Suspense
 */
const NavigationTracker: React.FC<{
  onNavigationComplete: () => void;
}> = ({ onNavigationComplete }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onCompleteRef = useRef(onNavigationComplete);
  onCompleteRef.current = onNavigationComplete;

  // Only complete when the route actually changes — not when the callback identity changes.
  useEffect(() => {
    onCompleteRef.current();
  }, [pathname, searchParams]);

  return null;
};

/**
 * Inner provider that manages loading state
 */
const LoadingProviderInner: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const pathname = usePathname();
  const apiPendingCountRef = useRef(0);
  const navigationPendingRef = useRef(false);
  const overlayActiveRef = useRef(false);
  const overlayStartedAtRef = useRef<number | null>(null);
  const overlayHideTimerRef = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);
  const OVERLAY_MIN_VISIBLE_MS = 250;
  // Soft navigations can stall under heavy work; never leave the overlay forever.
  const NAVIGATION_TIMEOUT_MS = 8000;

  const clearOverlayHideTimer = useCallback(() => {
    if (overlayHideTimerRef.current !== null) {
      window.clearTimeout(overlayHideTimerRef.current);
      overlayHideTimerRef.current = null;
    }
  }, []);

  const clearNavigationTimeout = useCallback(() => {
    if (navigationTimeoutRef.current !== null) {
      window.clearTimeout(navigationTimeoutRef.current);
      navigationTimeoutRef.current = null;
    }
  }, []);

  const hideOverlayWithMinDuration = useCallback(() => {
    const startedAt = overlayStartedAtRef.current;
    const elapsed = startedAt ? Date.now() - startedAt : OVERLAY_MIN_VISIBLE_MS;
    const remaining = Math.max(0, OVERLAY_MIN_VISIBLE_MS - elapsed);

    clearOverlayHideTimer();
    if (remaining > 0) {
      overlayHideTimerRef.current = window.setTimeout(() => {
        setShowOverlay(false);
        overlayHideTimerRef.current = null;
      }, remaining);
    } else {
      setShowOverlay(false);
    }
  }, [clearOverlayHideTimer]);

  const beginOverlay = useCallback(() => {
    clearOverlayHideTimer();
    overlayStartedAtRef.current = Date.now();
    setIsLoading(true);
    setShowOverlay(true);
    NProgress.start();
    overlayActiveRef.current = true;
  }, [clearOverlayHideTimer]);

  const endOverlayIfIdle = useCallback(() => {
    if (navigationPendingRef.current || apiPendingCountRef.current > 0) {
      return;
    }
    clearNavigationTimeout();
    setIsLoading(false);
    NProgress.done();
    hideOverlayWithMinDuration();
    overlayActiveRef.current = false;
  }, [clearNavigationTimeout, hideOverlayWithMinDuration]);

  // Stop loading indicator
  const stopLoading = useCallback(() => {
    navigationPendingRef.current = false;
    clearNavigationTimeout();
    endOverlayIfIdle();
  }, [clearNavigationTimeout, endOverlayIfIdle]);

  // Start loading indicator (navigation/manual)
  const startLoading = useCallback(() => {
    navigationPendingRef.current = true;
    clearNavigationTimeout();
    navigationTimeoutRef.current = window.setTimeout(() => {
      if (!navigationPendingRef.current) return;
      // Route never changed (or tracker missed it) — release the overlay.
      navigationPendingRef.current = false;
      navigationTimeoutRef.current = null;
      endOverlayIfIdle();
    }, NAVIGATION_TIMEOUT_MS);
    if (overlayActiveRef.current) return;
    beginOverlay();
  }, [beginOverlay, clearNavigationTimeout, endOverlayIfIdle]);

  const startApiLoading = useCallback(() => {
    apiPendingCountRef.current += 1;
    if (overlayActiveRef.current) return;
    beginOverlay();
  }, [beginOverlay]);

  const stopApiLoading = useCallback(() => {
    apiPendingCountRef.current = Math.max(0, apiPendingCountRef.current - 1);
    endOverlayIfIdle();
  }, [endOverlayIfIdle]);

  // Handle navigation complete - called by NavigationTracker
  const handleNavigationComplete = useCallback(() => {
    stopLoading();
  }, [stopLoading]);

  // Track all API requests globally (mutations only — GETs skip emit in http-client)
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ delta?: number }>;
      const delta = customEvent?.detail?.delta;
      if (delta === 1) startApiLoading();
      if (delta === -1) stopApiLoading();
    };

    window.addEventListener("os:api-loading", handler as EventListener);
    return () => window.removeEventListener("os:api-loading", handler as EventListener);
  }, [startApiLoading, stopApiLoading]);

  // Intercept link clicks to start loading BEFORE navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      
      if (!anchor) return;
      
      const href = anchor.getAttribute("href");
      
      // Skip if no href, external link, hash link, or special links
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return;
      }

      // Skip if same page (just a hash change or same path)
      const currentPath = pathname;
      const linkPath = href.split("?")[0].split("#")[0];
      
      if (linkPath === currentPath || linkPath === "") {
        return;
      }

      // Start loading for internal navigation
      startLoading();
    };

    // Add click listener to capture all link clicks
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [pathname, startLoading]);

  // Handle browser back/forward buttons and programmatic navigation
  useEffect(() => {
    // Patch history.pushState to detect programmatic navigation
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    const handleStateChange = (url: string | URL | null | undefined) => {
      // In practice, Next.js may call pushState/replaceState with `url` as null/undefined.
      // Treat any state change as a navigation start signal, and let NavigationTracker
      // complete it. This also ensures the overlay is visible even for very fast route changes.
      if (url) {
        const newPath =
          typeof url === "string" ? url.split("?")[0].split("#")[0] : url.pathname;
        const currentPath = window.location.pathname;
        // Skip hash-only changes or no-op navigations
        if (newPath === currentPath || newPath === "") {
          return;
        }
      }

      startLoading();
    };

    history.pushState = function (data, unused, url) {
      handleStateChange(url);
      return originalPushState(data, unused, url);
    };

    history.replaceState = function (data, unused, url) {
      handleStateChange(url);
      return originalReplaceState(data, unused, url);
    };

    // Handle popstate (back/forward buttons)
    const handlePopState = () => {
      startLoading();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname, startLoading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearOverlayHideTimer();
      clearNavigationTimeout();
      NProgress.done();
    };
  }, [clearOverlayHideTimer, clearNavigationTimeout]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        startLoading,
        stopLoading,
        showOverlay,
        setShowOverlay,
      }}
    >
      {/* Wrap NavigationTracker in Suspense as required by useSearchParams */}
      <Suspense fallback={null}>
        <NavigationTracker onNavigationComplete={handleNavigationComplete} />
      </Suspense>
      {children}
      <SimpleOverlay show={showOverlay} />
    </LoadingContext.Provider>
  );
};

/**
 * Main LoadingProvider export - wraps the inner provider
 */
export const LoadingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return <LoadingProviderInner>{children}</LoadingProviderInner>;
};

/**
 * Hook to access loading context
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within LoadingProvider");
  }
  return context;
};

/**
 * Helper function for wrapping async operations with loading state
 * Usage: await withLoading(async () => { ... }, { showOverlay: true });
 */
export const createLoadingWrapper = (
  startLoading: () => void,
  stopLoading: () => void,
  setShowOverlay: (show: boolean) => void
) => {
  return async <T,>(
    asyncFn: () => Promise<T>,
    options?: { showOverlay?: boolean }
  ): Promise<T> => {
    try {
      startLoading();
      if (options?.showOverlay) {
        setShowOverlay(true);
      }
      return await asyncFn();
    } finally {
      stopLoading();
    }
  };
};

/**
 * Hook that provides a wrapped loading function for API calls
 */
export const useLoadingWrapper = () => {
  const { startLoading, stopLoading, setShowOverlay } = useLoading();
  
  const withLoading = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options?: { showOverlay?: boolean }
    ): Promise<T> => {
      try {
        startLoading();
        if (options?.showOverlay) {
          setShowOverlay(true);
        }
        return await asyncFn();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading, setShowOverlay]
  );

  return { withLoading };
};
