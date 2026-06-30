import { useSeoSettings } from "@/services/settings/hooks/use-settings";
import {
  getAdminDashboardTitle,
  resolveAdminSiteLogo,
  resolveAdminSiteName,
} from "@/lib/site-branding";
import type { SeoSettings } from "@/services/settings/types/settings.types";

export function useResolvedSiteBranding(options?: { enabled?: boolean }) {
  const query = useSeoSettings(options);
  const { data, isPending, isPlaceholderData } = query;

  const isResolved =
    data !== undefined && (!isPending || isPlaceholderData);

  const brandingSettings: Pick<
    SeoSettings,
    "site_name_en" | "site_name_ar" | "site_logo"
  > | null = data ?? null;

  const siteName = resolveAdminSiteName(brandingSettings);
  const siteLogo = isResolved ? resolveAdminSiteLogo(brandingSettings) : null;
  const dashboardTitle = getAdminDashboardTitle(brandingSettings);

  return {
    ...query,
    brandingSettings,
    siteName,
    siteLogo,
    dashboardTitle,
    isResolved,
    isBrandingPending: !isResolved,
  };
}
