"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth.context";
import { registerAdminClientDevice } from "@/lib/register-admin-client-device";

/**
 * While an admin is logged into the dashboard, mark this browser's client id
 * once per auth session (source: admin_fe). Do not re-register on every route
 * change — that inflated "last seen" without real visitor activity.
 */
export function RegisterAdminDashboardClient() {
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.id) return;

    void registerAdminClientDevice("admin_fe");
  }, [isAuthenticated, isLoading, user?.id]);

  return null;
}
