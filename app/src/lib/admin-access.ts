import type { FeatureToggles } from "@/services/settings/types/settings.types";

export type AdminAccessFeatureToggle = keyof Pick<
  FeatureToggles,
  | "vendors_enabled"
  | "attributes_enabled"
  | "specifications_enabled"
  | "partners_enabled"
  | "banners_enabled"
  | "cashback_enabled"
  | "weight_and_dimensions_enabled"
  | "product_files_enabled"
>;

/** Section/nav access keys (sidebar + route guards). */
export const ADMIN_SECTION_ACCESS_KEYS = [
  "products",
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
  "concepts",
  "archived",
  "analytics",
  "settings",
  "admins",
  "catalog_requests",
] as const;

/**
 * Product form step keys — when disabled, the step is hidden on create/edit
 * product forms for that admin. `product_pricing` also gates pricing routes.
 */
export const PRODUCT_FORM_ACCESS_KEYS = [
  "product_form_basic",
  "product_form_attributes",
  "product_form_specifications",
  "product_form_stock",
  "product_pricing",
  "product_form_weight_dimensions",
  "product_form_media",
  "product_form_attachments",
] as const;

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
  "concepts",
  "archived",
  "analytics",
  "settings",
  "admins",
  "catalog_requests",
  "product_form_basic",
  "product_form_attributes",
  "product_form_specifications",
  "product_form_stock",
  "product_form_weight_dimensions",
  "product_form_media",
  "product_form_attachments",
] as const;

export type AdminAccessKey = (typeof ADMIN_ACCESS_KEYS)[number];
export type ProductFormAccessKey = (typeof PRODUCT_FORM_ACCESS_KEYS)[number];
export type AdminSectionAccessKey = (typeof ADMIN_SECTION_ACCESS_KEYS)[number];
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
  product_form_attributes: "attributes_enabled",
  product_form_specifications: "specifications_enabled",
  product_form_weight_dimensions: "weight_and_dimensions_enabled",
  product_form_attachments: "product_files_enabled",
};

const ALL_PRODUCT_FORM_STEPS_ON = {
  product_form_basic: true,
  product_form_attributes: true,
  product_form_specifications: true,
  product_form_stock: true,
  product_form_weight_dimensions: true,
  product_form_media: true,
  product_form_attachments: true,
} as const;

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
  concepts: true,
  archived: true,
  analytics: true,
  settings: true,
  admins: true,
  catalog_requests: true,
  ...ALL_PRODUCT_FORM_STEPS_ON,
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
  concepts: true,
  archived: false,
  analytics: false,
  settings: false,
  admins: false,
  catalog_requests: true,
  ...ALL_PRODUCT_FORM_STEPS_ON,
  product_form_stock: true,
  product_form_media: true,
  product_form_attachments: true,
};

/** Vendor/store portal defaults — matches the current simplified product form. */
export const DEFAULT_VENDOR_PORTAL_ACCESS: AdminAccess = {
  products: true,
  product_pricing: true,
  categories: false,
  vendors: false,
  brands: false,
  attributes: false,
  specifications: false,
  orders: false,
  customers: false,
  partners: false,
  banners: false,
  cashback_rules: false,
  notes: false,
  concepts: false,
  archived: false,
  analytics: false,
  settings: false,
  admins: false,
  catalog_requests: false,
  product_form_basic: true,
  product_form_attributes: false,
  product_form_specifications: false,
  product_form_stock: false,
  product_form_weight_dimensions: false,
  product_form_media: true,
  product_form_attachments: false,
};

export const ADMIN_ACCESS_LABELS: Record<AdminAccessKey, string> = {
  products: "Products",
  product_pricing: "Pricing",
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
  concepts: "Concepts",
  archived: "Archived",
  analytics: "Analytics",
  settings: "Settings",
  admins: "Admins",
  catalog_requests: "Catalog requests",
  product_form_basic: "Basic information",
  product_form_attributes: "Attributes",
  product_form_specifications: "Specifications",
  product_form_stock: "Stock",
  product_form_weight_dimensions: "Weight & dimensions",
  product_form_media: "Media",
  product_form_attachments: "Attachments",
};

export const PRODUCT_FORM_ACCESS_LABELS: Record<ProductFormAccessKey, string> = {
  product_form_basic: ADMIN_ACCESS_LABELS.product_form_basic,
  product_form_attributes: ADMIN_ACCESS_LABELS.product_form_attributes,
  product_form_specifications: ADMIN_ACCESS_LABELS.product_form_specifications,
  product_form_stock: ADMIN_ACCESS_LABELS.product_form_stock,
  product_pricing: ADMIN_ACCESS_LABELS.product_pricing,
  product_form_weight_dimensions: ADMIN_ACCESS_LABELS.product_form_weight_dimensions,
  product_form_media: ADMIN_ACCESS_LABELS.product_form_media,
  product_form_attachments: ADMIN_ACCESS_LABELS.product_form_attachments,
};

export function createDefaultAdminAccess(): AdminAccess {
  return { ...DEFAULT_ADMIN_ACCESS };
}

export function getDefaultAdminAccessForRole(
  role: UserRole | undefined,
): AdminAccess {
  return getDefaultAccessForRole(role);
}

type UserRole =
  | "user"
  | "admin"
  | "constant_token_admin"
  | "catalog_manager"
  | "vendor_admin"
  | "store_admin";

function getDefaultAccessForRole(role: UserRole | undefined): AdminAccess {
  if (role === "catalog_manager") {
    return { ...DEFAULT_CATALOG_MANAGER_ACCESS };
  }

  if (role === "vendor_admin" || role === "store_admin") {
    return { ...DEFAULT_VENDOR_PORTAL_ACCESS };
  }

  if (role === "admin" || role === "constant_token_admin") {
    return { ...DEFAULT_ADMIN_ACCESS };
  }

  return ADMIN_ACCESS_KEYS.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as AdminAccess);
}

function normalizeExplicitAdminAccess(
  value: unknown,
  fallback: AdminAccess,
): AdminAccess | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const normalized = { ...fallback };

  for (const key of ADMIN_ACCESS_KEYS) {
    if (typeof record[key] === "boolean") {
      normalized[key] = record[key] === true;
    }
  }

  return normalized;
}

/** Mirrors backend resolveAdminAccess — explicit JSON wins, else role defaults. */
export function resolveAdminAccess(user: {
  role?: UserRole;
  adminAccess?: Partial<AdminAccess> | null;
} | null | undefined): AdminAccess {
  const fallback = getDefaultAccessForRole(user?.role);
  const explicit = normalizeExplicitAdminAccess(user?.adminAccess, fallback);
  if (explicit) {
    return explicit;
  }

  return fallback;
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
  keys: readonly AdminAccessKey[] = ADMIN_ACCESS_KEYS,
): AdminAccessKey[] {
  return keys.filter((key) => {
    const toggle = ADMIN_ACCESS_FEATURE_TOGGLES[key];
    if (!toggle) {
      return true;
    }
    return isFeatureEnabled(toggle);
  });
}

export function getVisibleSectionAccessKeys(
  isFeatureEnabled: (key: AdminAccessFeatureToggle) => boolean,
): AdminAccessKey[] {
  return getAdminAccessKeysVisibleByFeatureToggle(
    isFeatureEnabled,
    ADMIN_SECTION_ACCESS_KEYS,
  );
}

export function getVisibleProductFormAccessKeys(
  isFeatureEnabled: (key: AdminAccessFeatureToggle) => boolean,
): ProductFormAccessKey[] {
  return getAdminAccessKeysVisibleByFeatureToggle(
    isFeatureEnabled,
    PRODUCT_FORM_ACCESS_KEYS,
  ) as ProductFormAccessKey[];
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
