/**
 * Protected Route Wrapper - redirects to login if not authenticated
 * Integrates with session management and shows session expiration warning
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useAuth } from "../../contexts/auth.context";
import { useLoading } from "../../providers/loading-provider";
import { SessionExpirationModal } from "./SessionExpirationModal";
import { sessionManager } from "../../lib/session/session-manager";
import { isAuthRoute } from "../../lib/auth-routes";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    isAuthenticated,
    isLoading,
    sessionWarning,
    extendSession,
    logout,
    dismissSessionWarning,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { setShowOverlay } = useLoading();

  // Show loading overlay while checking auth
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthRoute(pathname)) {
      // Save the current path so we can redirect back after login
      sessionManager.setIntendedUrl(pathname + window.location.search);
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  // Show nothing while loading - overlay handles the visual feedback
  if (isLoading) {
    return null;
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated && !isAuthRoute(pathname)) {
    return null;
  }

  return (
    <>
      {children}
      
      {/* Session Expiration Modal */}
      {sessionWarning && (
        <SessionExpirationModal
          isOpen={sessionWarning.show}
          expiresAt={sessionWarning.expiresAt}
          timeRemaining={sessionWarning.timeRemaining}
          onExtendSession={extendSession}
          onLogout={logout}
          onDismiss={dismissSessionWarning}
        />
      )}
    </>
  );
};
