import type { SeoSettings } from "@/services/settings/types/settings.types";
import { DEFAULT_BRAND_THEME } from "./brand-theme.defaults.generated";

export type BrandThemeColorKey =
  | "brand_primary"
  | "brand_primary_2"
  | "brand_primary_3"
  | "brand_secondary"
  | "brand_success"
  | "brand_success_2"
  | "brand_danger"
  | "brand_danger_2";

export type BrandThemeColors = Record<BrandThemeColorKey, string>;

export { DEFAULT_BRAND_THEME };

export const BRAND_THEME_FIELDS: Array<{
  key: BrandThemeColorKey;
  label: string;
  description?: string;
}> = [
  { key: "brand_primary", label: "Primary" },
  { key: "brand_primary_2", label: "Primary Light" },
  { key: "brand_primary_3", label: "Primary Lighter" },
  { key: "brand_secondary", label: "Secondary" },
  { key: "brand_success", label: "Success" },
  { key: "brand_success_2", label: "Success Light" },
  { key: "brand_danger", label: "Danger" },
  { key: "brand_danger_2", label: "Danger Dark" },
];

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{6})$/;

export function isValidHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value.trim());
}

export function normalizeHexColor(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return isValidHexColor(trimmed) ? trimmed : null;
}

export type BrandThemeSettings = Pick<SeoSettings, BrandThemeColorKey>;

export function resolveBrandTheme(
  settings?: Partial<BrandThemeSettings> | null,
): BrandThemeColors {
  return {
    brand_primary:
      normalizeHexColor(settings?.brand_primary) ??
      DEFAULT_BRAND_THEME.brand_primary,
    brand_primary_2:
      normalizeHexColor(settings?.brand_primary_2) ??
      DEFAULT_BRAND_THEME.brand_primary_2,
    brand_primary_3:
      normalizeHexColor(settings?.brand_primary_3) ??
      DEFAULT_BRAND_THEME.brand_primary_3,
    brand_secondary:
      normalizeHexColor(settings?.brand_secondary) ??
      DEFAULT_BRAND_THEME.brand_secondary,
    brand_success:
      normalizeHexColor(settings?.brand_success) ??
      DEFAULT_BRAND_THEME.brand_success,
    brand_success_2:
      normalizeHexColor(settings?.brand_success_2) ??
      DEFAULT_BRAND_THEME.brand_success_2,
    brand_danger:
      normalizeHexColor(settings?.brand_danger) ??
      DEFAULT_BRAND_THEME.brand_danger,
    brand_danger_2:
      normalizeHexColor(settings?.brand_danger_2) ??
      DEFAULT_BRAND_THEME.brand_danger_2,
  };
}

export function applyBrandThemeToDocument(theme: BrandThemeColors) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.style.setProperty("--brand-primary", theme.brand_primary);
  root.style.setProperty("--brand-primary-2", theme.brand_primary_2);
  root.style.setProperty("--brand-primary-3", theme.brand_primary_3);
  root.style.setProperty("--brand-secondary", theme.brand_secondary);
  root.style.setProperty("--brand-success", theme.brand_success);
  root.style.setProperty("--brand-success-2", theme.brand_success_2);
  root.style.setProperty("--brand-danger", theme.brand_danger);
  root.style.setProperty("--brand-danger-2", theme.brand_danger_2);

  root.style.setProperty(
    "--border1",
    `color-mix(in srgb, ${theme.brand_primary} 18%, transparent)`,
  );
  root.style.setProperty(
    "--autofill-bg",
    `color-mix(in srgb, ${theme.brand_primary} 6%, white)`,
  );
}

export function toBrandThemePayload(
  formState: Partial<Record<BrandThemeColorKey, string>>,
): Partial<Record<BrandThemeColorKey, string | null>> {
  return BRAND_THEME_FIELDS.reduce(
    (acc, field) => {
      const rawValue = formState[field.key];
      acc[field.key] =
        typeof rawValue === "string" && rawValue.trim().length > 0
          ? normalizeHexColor(rawValue)
          : null;
      return acc;
    },
    {} as Partial<Record<BrandThemeColorKey, string | null>>,
  );
}
