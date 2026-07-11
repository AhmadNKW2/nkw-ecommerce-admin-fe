import type { FeatureToggles } from "@/services/settings/types/settings.types";

export type AdminAccessFeatureToggle = keyof Pick<
  FeatureToggles,
  | "vendors_enabled"
  | "attributes_enabled"
  | "specifications_enabled"
  | "partners_enabled"
  | "banners_enabled"
  | "cashback_enabled"
>;

export const ADMIN_ACCESS_KEYS = [
  "products",
  "product_pricing",
  "categories",
  "vendors",
  "brands",
  "attributes",
  "specifications",
  "orders",
  "customers",
  "partners",
  "banners",
  "cashback_rules",
  "notes",
  "settings",
  "admins",
] as const;

export type AdminAccessKey = (typeof ADMIN_ACCESS_KEYS)[number];
export type AdminAccess = Record<AdminAccessKey, boolean>;

/** Maps admin-access keys to feature toggles that gate them project-wide. */
export const ADMIN_ACCESS_FEATURE_TOGGLES: Partial<
  Record<AdminAccessKey, AdminAccessFeatureToggle>
> = {
  vendors: "vendors_enabled",
  attributes: "attributes_enabled",
  specifications: "specifications_enabled",
  partners: "partners_enabled",
  banners: "banners_enabled",
  cashback_rules: "cashback_enabled",
};

export const DEFAULT_ADMIN_ACCESS: AdminAccess = {
  products: true,
  product_pricing: true,
  categories: true,
  vendors: true,
  brands: true,
  attributes: true,
  specifications: true,
  orders: true,
  customers: true,
  partners: true,
  banners: true,
  cashback_rules: true,
  notes: true,
  settings: true,
  admins: true,
};

export const DEFAULT_CATALOG_MANAGER_ACCESS: AdminAccess = {
  products: true,
  product_pricing: false,
  categories: true,
  vendors: true,
  brands: true,
  attributes: true,
  specifications: true,
  orders: false,
  customers: false,
  partners: false,
  banners: false,
  cashback_rules: false,
  notes: false,
  settings: false,
  admins: false,
};

export const ADMIN_ACCESS_LABELS: Record<AdminAccessKey, string> = {
  products: "Products",
  product_pricing: "Product pricing",
  categories: "Categories",
  vendors: "Vendors",
  brands: "Brands",
  attributes: "Attributes",
  specifications: "Specifications",
  orders: "Orders",
  customers: "Customers",
  partners: "Partners",
  banners: "Banners",
  cashback_rules: "Cashback rules",
  notes: "Notes",
  settings: "Settings",
  admins: "Admins",
};

export function createDefaultAdminAccess(): AdminAccess {
  return { ...DEFAULT_ADMIN_ACCESS };
}

type UserRole = "user" | "admin" | "constant_token_admin" | "catalog_manager";

function getDefaultAccessForRole(role: UserRole | undefined): AdminAccess {
  if (role === "catalog_manager") {
    return { ...DEFAULT_CATALOG_MANAGER_ACCESS };
  }

  if (role === "admin" || role === "constant_token_admin") {
    return { ...DEFAULT_ADMIN_ACCESS };
  }

  return ADMIN_ACCESS_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as AdminAccess);
}

function normalizeExplicitAdminAccess(value: unknown): AdminAccess | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const normalized = {} as AdminAccess;

  for (const key of ADMIN_ACCESS_KEYS) {
    normalized[key] = record[key] === true;
  }

  return normalized;
}

/** Mirrors backend resolveAdminAccess — explicit JSON wins, else role defaults. */
export function resolveAdminAccess(user: {
  role?: UserRole;
  adminAccess?: Partial<AdminAccess> | null;
} | null | undefined): AdminAccess {
  const explicit = normalizeExplicitAdminAccess(user?.adminAccess);
  if (explicit) {
    return explicit;
  }

  return getDefaultAccessForRole(user?.role);
}

export function normalizeAdminAccess(
  value: Partial<AdminAccess> | null | undefined,
  fallback: AdminAccess = DEFAULT_ADMIN_ACCESS,
): AdminAccess {
  const next = { ...fallback };

  for (const key of ADMIN_ACCESS_KEYS) {
    if (typeof value?.[key] === "boolean") {
      next[key] = value[key];
    }
  }

  return next;
}

export function getAdminAccessKeysVisibleByFeatureToggle(
  isFeatureEnabled: (key: AdminAccessFeatureToggle) => boolean,
): AdminAccessKey[] {
  return ADMIN_ACCESS_KEYS.filter((key) => {
    const toggle = ADMIN_ACCESS_FEATURE_TOGGLES[key];
    if (!toggle) {
      return true;
    }
    return isFeatureEnabled(toggle);
  });
}

export function constrainAdminAccessByFeatureToggles(
  access: AdminAccess,
  isFeatureEnabled: (key: AdminAccessFeatureToggle) => boolean,
): AdminAccess {
  const next = { ...access };

  for (const [key, toggle] of Object.entries(ADMIN_ACCESS_FEATURE_TOGGLES) as Array<
    [AdminAccessKey, AdminAccessFeatureToggle]
  >) {
    if (!isFeatureEnabled(toggle)) {
      next[key] = false;
    }
  }

  return next;
}
