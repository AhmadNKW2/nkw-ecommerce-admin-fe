"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useAuth } from "@/contexts/auth.context";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { canAccessRoute } from "@/lib/route-admin-access";

export function RouteAdminAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { canAccess } = useAdminAccess();

  const allowed = canAccessRoute(pathname, user?.role, canAccess);

  useEffect(() => {
    if (!isLoading && user && !allowed) {
      router.replace("/products");
    }
  }, [allowed, isLoading, router, user]);

  if (isLoading || !user) {
    return null;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
