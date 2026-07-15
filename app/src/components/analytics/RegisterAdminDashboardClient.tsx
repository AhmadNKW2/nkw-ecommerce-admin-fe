"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth.context";
import { registerAdminClientDevice } from "@/lib/register-admin-client-device";

/**
 * While an admin is logged into the dashboard, re-register this browser's
 * client id on load/refresh and on every route change (source: admin_fe).
 * Multiple devices/profiles for the same admin account are supported.
 */
export function RegisterAdminDashboardClient() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.id) return;
    if (pathname === "/login") return;

    void registerAdminClientDevice("admin_fe");
  }, [isAuthenticated, isLoading, user?.id, pathname]);

  return null;
}
