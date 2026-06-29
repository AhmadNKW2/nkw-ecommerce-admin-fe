"use client";

import { useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";

export function FeatureToggleGuard({
  toggle,
  redirectTo = "/products",
  children,
}: {
  toggle: "import_ai_products_enabled" | "banners_enabled";
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();

  const enabled = isEnabled(toggle);

  useEffect(() => {
    if (isResolved && !enabled) {
      router.replace(redirectTo);
    }
  }, [enabled, isResolved, redirectTo, router]);

  if (!isResolved || !enabled) {
    return null;
  }

  return <>{children}</>;
}
