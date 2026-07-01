import type { FeatureToggles } from "@/services/settings/types/settings.types";

export type SettingsLinkFeatureToggle = keyof Pick<
  FeatureToggles,
  "popup_enabled" | "import_ai_products_enabled"
>;

export type SettingsLinkDefinition = {
  href: string;
  label: string;
  navLabel: string;
  featureToggle?: SettingsLinkFeatureToggle;
};

/** Canonical settings links used by SettingsNav, sidebar reorder UI, and sidebar config. */
export const SETTINGS_LINK_DEFINITIONS: SettingsLinkDefinition[] = [
  { href: "/settings/seo", label: "SEO Settings", navLabel: "SEO" },
  { href: "/settings/appearance", label: "Appearance", navLabel: "Appearance" },
  { href: "/settings/features", label: "Feature Settings", navLabel: "Feature Settings" },
  { href: "/settings/popup", label: "Site Popup", navLabel: "Site Popup", featureToggle: "popup_enabled" },
  {
    href: "/settings/product-import",
    label: "Product Import",
    navLabel: "Product Import",
    featureToggle: "import_ai_products_enabled",
  },
  { href: "/settings/inventory", label: "Inventory Settings", navLabel: "Inventory" },
  { href: "/settings/pricing", label: "Pricing Rules", navLabel: "Pricing Rules" },
  { href: "/settings/sidebar", label: "Sidebar", navLabel: "Sidebar" },
];

export function filterSettingsLinksByFeatureToggle<T extends SettingsLinkDefinition>(
  links: T[],
  isEnabled: (key: SettingsLinkFeatureToggle) => boolean,
): T[] {
  return links.filter((link) => {
    if (!link.featureToggle) {
      return true;
    }
    return isEnabled(link.featureToggle);
  });
}

export function responsiveGridColsClass(
  count: number,
  baseClass = "grid gap-2",
): string {
  if (count <= 1) return baseClass;
  if (count === 2) return `${baseClass} md:grid-cols-2`;
  if (count === 3) return `${baseClass} md:grid-cols-2 xl:grid-cols-3`;
  return `${baseClass} md:grid-cols-2 xl:grid-cols-4`;
}
