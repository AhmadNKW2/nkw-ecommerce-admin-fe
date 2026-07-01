"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth.context";
import {
  ADMIN_ACCESS_KEYS,
  constrainAdminAccessByFeatureToggles,
  DEFAULT_ADMIN_ACCESS,
  type AdminAccess,
  type AdminAccessKey,
} from "@/lib/admin-access";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";

export function useAdminAccess() {
  const { user } = useAuth();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();

  const access = useMemo<AdminAccess>(() => {
    const base = !user?.adminAccess
      ? { ...DEFAULT_ADMIN_ACCESS }
      : ADMIN_ACCESS_KEYS.reduce((acc, key) => {
          acc[key] = user.adminAccess?.[key] ?? DEFAULT_ADMIN_ACCESS[key];
          return acc;
        }, {} as AdminAccess);

    if (!isResolved) {
      return base;
    }

    return constrainAdminAccessByFeatureToggles(base, isEnabled);
  }, [user?.adminAccess, isResolved, isEnabled]);

  const canAccess = (key: AdminAccessKey) => access[key];

  return {
    access,
    canAccess,
    canEditProductPricing: access.product_pricing,
  };
}
