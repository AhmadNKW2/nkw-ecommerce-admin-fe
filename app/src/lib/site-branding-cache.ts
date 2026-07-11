import type { QueryClient } from "@tanstack/react-query";
import type { SeoSettings } from "@/services/settings/types/settings.types";
import { applyBrandThemeToDocument, resolveBrandTheme } from "./brand-theme";
import { updateDocumentFavicon } from "./site-branding";

const STORAGE_KEY = "nkw-admin-site-branding";

export type StoredSiteBranding = Pick<
  SeoSettings,
  | "site_name_en"
  | "site_name_ar"
  | "site_logo"
  | "brand_primary"
  | "brand_primary_2"
  | "brand_primary_3"
  | "brand_secondary"
  | "brand_success"
  | "brand_success_2"
  | "brand_danger"
  | "brand_danger_2"
>;

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readNullableString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return value === null ? null : undefined;
}

function normalizeStored(value: unknown): StoredSiteBranding | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const site_name_en = readOptionalString(record.site_name_en);
  const site_name_ar = readOptionalString(record.site_name_ar);

  if (!site_name_en || !site_name_ar) {
    return undefined;
  }

  return {
    site_name_en,
    site_name_ar,
    site_logo: readNullableString(record.site_logo) ?? null,
    brand_primary: readNullableString(record.brand_primary) ?? null,
    brand_primary_2: readNullableString(record.brand_primary_2) ?? null,
    brand_primary_3: readNullableString(record.brand_primary_3) ?? null,
    brand_secondary: readNullableString(record.brand_secondary) ?? null,
    brand_success: readNullableString(record.brand_success) ?? null,
    brand_success_2: readNullableString(record.brand_success_2) ?? null,
    brand_danger: readNullableString(record.brand_danger) ?? null,
    brand_danger_2: readNullableString(record.brand_danger_2) ?? null,
  };
}

export function readStoredSiteBranding(): StoredSiteBranding | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return undefined;
    }

    return normalizeStored(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function writeStoredSiteBranding(settings: SeoSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredSiteBranding = {
    site_name_en: settings.site_name_en,
    site_name_ar: settings.site_name_ar,
    site_logo: settings.site_logo ?? null,
    brand_primary: settings.brand_primary ?? null,
    brand_primary_2: settings.brand_primary_2 ?? null,
    brand_primary_3: settings.brand_primary_3 ?? null,
    brand_secondary: settings.brand_secondary ?? null,
    brand_success: settings.brand_success ?? null,
    brand_success_2: settings.brand_success_2 ?? null,
    brand_danger: settings.brand_danger ?? null,
    brand_danger_2: settings.brand_danger_2 ?? null,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function toCachedSeoSettings(stored: StoredSiteBranding): SeoSettings {
  return {
    id: 0,
    site_name_en: stored.site_name_en ?? "",
    site_name_ar: stored.site_name_ar ?? "",
    site_logo: stored.site_logo ?? null,
    brand_primary: stored.brand_primary ?? null,
    brand_primary_2: stored.brand_primary_2 ?? null,
    brand_primary_3: stored.brand_primary_3 ?? null,
    brand_secondary: stored.brand_secondary ?? null,
    brand_success: stored.brand_success ?? null,
    brand_success_2: stored.brand_success_2 ?? null,
    brand_danger: stored.brand_danger ?? null,
    brand_danger_2: stored.brand_danger_2 ?? null,
    default_meta_title_en: "",
    default_meta_title_ar: "",
    default_meta_description_en: "",
    default_meta_description_ar: "",
    default_og_image: null,
    twitter_handle: null,
    support_email: "help@ordonsooq.com",
    facebook_url: null,
    twitter_url: null,
    instagram_url: null,
    google_verification: null,
    robots_index: true,
    robots_follow: true,
    show_sale_pricing: true,
    free_delivery_enabled: true,
    free_delivery_amount: 50,
    delivery_fee: 2,
    low_stock_threshold: 10,
  };
}

export function applyCachedDocumentBranding(): void {
  const stored = readStoredSiteBranding();
  if (!stored) {
    return;
  }

  updateDocumentFavicon(
    typeof stored.site_logo === "string" && stored.site_logo.trim().length > 0
      ? stored.site_logo
      : null,
  );

  applyBrandThemeToDocument(resolveBrandTheme(stored));
}

export function hydrateSiteBrandingQueryClient(queryClient: QueryClient): void {
  if (typeof window === "undefined") {
    return;
  }

  const stored = readStoredSiteBranding();
  if (!stored) {
    return;
  }

  applyCachedDocumentBranding();
}
