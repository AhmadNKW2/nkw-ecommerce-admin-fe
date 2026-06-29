"use client";

import { FeatureToggleGuard } from "../src/components/settings/FeatureToggleGuard";

export default function BannersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureToggleGuard toggle="banners_enabled" redirectTo="/">
      {children}
    </FeatureToggleGuard>
  );
}
