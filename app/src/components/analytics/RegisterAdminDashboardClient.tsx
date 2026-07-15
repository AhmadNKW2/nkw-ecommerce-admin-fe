"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth.context";
import { registerAdminClientDevice } from "@/lib/register-admin-client-device";

/**
 * While an admin is logged into the dashboard, keep this browser/device
 * registered in admin_client_devices (source: admin_fe).
 */
export function RegisterAdminDashboardClient() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const lastUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.id) return;

    lastUserIdRef.current = Number(user.id);
    void registerAdminClientDevice("admin_fe");
  }, [isAuthenticated, isLoading, user?.id]);

  return null;
}
