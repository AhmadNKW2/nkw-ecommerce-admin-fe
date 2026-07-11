"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth.context";
import {
  constrainAdminAccessByFeatureToggles,
  resolveAdminAccess,
  type AdminAccess,
  type AdminAccessKey,
} from "@/lib/admin-access";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";

export function useAdminAccess() {
  const { user } = useAuth();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();

  const access = useMemo<AdminAccess>(() => {
    const base = resolveAdminAccess(user);

    if (!isResolved) {
      return base;
    }

    return constrainAdminAccessByFeatureToggles(base, isEnabled);
  }, [user, isResolved, isEnabled]);

  const canAccess = (key: AdminAccessKey) => access[key];

  return {
    access,
    canAccess,
    canEditProductPricing: access.product_pricing,
  };
}
