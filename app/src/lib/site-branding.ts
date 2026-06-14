import type { SeoSettings } from "@/services/settings/types/settings.types";

export const DEFAULT_ADMIN_SITE_NAME = "Storefront";

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

export function resolveAdminSiteName(
  seoSettings?: Pick<SeoSettings, "site_name_en" | "site_name_ar"> | null,
) {
  return pickFirstNonEmpty(
    seoSettings?.site_name_en,
    seoSettings?.site_name_ar,
    DEFAULT_ADMIN_SITE_NAME,
  )!;
}

export function getAdminDashboardTitle(
  seoSettings?: Pick<SeoSettings, "site_name_en" | "site_name_ar"> | null,
) {
  return `${resolveAdminSiteName(seoSettings)} Admin Dashboard`;
}
