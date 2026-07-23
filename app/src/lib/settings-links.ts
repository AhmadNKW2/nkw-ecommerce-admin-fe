import type { FeatureToggles } from "@/services/settings/types/settings.types";

import type { AdminAccessKey } from "@/lib/admin-access";
import { passesAdminAccessCheck, roleMatchesAllowedRoles } from "@/lib/admin-access-checks";
import type { UserRole } from "@/services/auth/types/auth.types";

export type SettingsLinkFeatureToggle = keyof Pick<
  FeatureToggles,
  "popup_enabled" | "import_ai_products_enabled"
>;

export type SettingsLinkDefinition = {
  href: string;
  label: string;
  navLabel: string;
  featureToggle?: SettingsLinkFeatureToggle;
  roles?: ("admin")[];
  adminAccess?: AdminAccessKey;
};

/** Canonical settings links used by SettingsNav, sidebar reorder UI, and sidebar config. */
export const SETTINGS_LINK_DEFINITIONS: SettingsLinkDefinition[] = [
  { href: "/settings/seo", label: "SEO Settings", navLabel: "SEO", roles: ["admin"], adminAccess: "settings" },
  { href: "/settings/appearance", label: "Appearance", navLabel: "Appearance", roles: ["admin"], adminAccess: "settings" },
  { href: "/settings/features", label: "Feature Settings", navLabel: "Feature Settings", roles: ["admin"], adminAccess: "settings" },
  { href: "/settings/popup", label: "Site Popup", navLabel: "Site Popup", featureToggle: "popup_enabled", roles: ["admin"], adminAccess: "settings" },
  {
    href: "/settings/terms",
    label: "Search Concepts",
    navLabel: "Search Concepts",
    roles: ["admin"],
    adminAccess: "concepts",
  },
  {
    href: "/settings/search",
    label: "Search",
    navLabel: "Search",
    roles: ["admin"],
    adminAccess: "settings",
  },
  {
    href: "/settings/product-import",
    label: "Product Import",
    navLabel: "Product Import",
    featureToggle: "import_ai_products_enabled",
    roles: ["admin"],
    adminAccess: "settings",
  },
  { href: "/settings/inventory", label: "Inventory Settings", navLabel: "Inventory", roles: ["admin"], adminAccess: "settings" },
  { href: "/settings/shipping", label: "Shipping Settings", navLabel: "Shipping", roles: ["admin"], adminAccess: "settings" },
  { href: "/settings/pricing", label: "Pricing Rules", navLabel: "Pricing Rules", roles: ["admin"], adminAccess: "settings" },
  { href: "/settings/sidebar", label: "Sidebar", navLabel: "Sidebar", roles: ["admin"], adminAccess: "settings" },
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

export function filterSettingsLinksByAccess<T extends SettingsLinkDefinition>(
  links: T[],
  options: {
    role?: UserRole;
    canAccess: (key: AdminAccessKey) => boolean;
  },
): T[] {
  return links.filter((link) => {
    if (!roleMatchesAllowedRoles(options.role, link.roles)) {
      return false;
    }

    return passesAdminAccessCheck(link.adminAccess, {
      role: options.role,
      canAccess: options.canAccess,
    });
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
