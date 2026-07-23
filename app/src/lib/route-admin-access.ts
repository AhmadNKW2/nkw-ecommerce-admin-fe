import type { AdminAccessKey } from "@/lib/admin-access";
import { passesAdminAccessCheck, roleMatchesAllowedRoles } from "@/lib/admin-access-checks";
import type { UserRole } from "@/services/auth/types/auth.types";

type RouteAccessRule = {
  prefix: string;
  access: AdminAccessKey;
  roles?: Extract<
    UserRole,
    "admin" | "constant_token_admin" | "vendor_admin" | "store_admin"
  >[];
};

const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  { prefix: "/settings/terms", access: "concepts", roles: ["admin", "constant_token_admin"] },
  { prefix: "/settings", access: "settings", roles: ["admin", "constant_token_admin"] },
  { prefix: "/products/pricing", access: "product_pricing", roles: ["admin", "constant_token_admin"] },
  { prefix: "/pricing-products", access: "product_pricing", roles: ["admin", "constant_token_admin"] },
  { prefix: "/archived-products", access: "archived", roles: ["admin", "constant_token_admin"] },
  { prefix: "/archived-categories", access: "archived", roles: ["admin", "constant_token_admin"] },
  { prefix: "/archived-vendors", access: "archived", roles: ["admin", "constant_token_admin"] },
  { prefix: "/archived-brands", access: "archived", roles: ["admin", "constant_token_admin"] },
  { prefix: "/concepts", access: "concepts", roles: ["admin", "constant_token_admin"] },
  { prefix: "/quick-submit", access: "products", roles: ["admin", "constant_token_admin", "vendor_admin", "store_admin"] },
  { prefix: "/product-submissions", access: "products", roles: ["admin", "constant_token_admin"] },
  { prefix: "/catalog-requests", access: "catalog_requests", roles: ["admin", "constant_token_admin"] },
  { prefix: "/products", access: "products", roles: ["admin", "constant_token_admin", "vendor_admin", "store_admin"] },
  { prefix: "/categories", access: "categories", roles: ["admin", "constant_token_admin"] },
  { prefix: "/vendors", access: "vendors", roles: ["admin", "constant_token_admin"] },
  { prefix: "/brands", access: "brands", roles: ["admin", "constant_token_admin"] },
  { prefix: "/attributes", access: "attributes", roles: ["admin", "constant_token_admin"] },
  { prefix: "/specifications", access: "specifications", roles: ["admin", "constant_token_admin"] },
  { prefix: "/analytics", access: "analytics", roles: ["admin", "constant_token_admin"] },
  { prefix: "/orders", access: "orders", roles: ["admin", "constant_token_admin"] },
  { prefix: "/customers", access: "customers", roles: ["admin", "constant_token_admin"] },
  { prefix: "/partners", access: "partners", roles: ["admin", "constant_token_admin"] },
  { prefix: "/notes", access: "notes", roles: ["admin", "constant_token_admin"] },
  { prefix: "/admins", access: "admins", roles: ["admin", "constant_token_admin"] },
  { prefix: "/banners", access: "banners", roles: ["admin", "constant_token_admin"] },
  { prefix: "/cashback-rules", access: "cashback_rules", roles: ["admin", "constant_token_admin"] },
];

export type RouteAccessMatch = RouteAccessRule;

export function getRouteAccessRule(pathname: string): RouteAccessMatch | null {
  const normalizedPath = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";

  for (const rule of ROUTE_ACCESS_RULES) {
    if (normalizedPath === rule.prefix || normalizedPath.startsWith(`${rule.prefix}/`)) {
      return rule;
    }
  }

  return null;
}

export function canAccessRoute(
  pathname: string,
  role: UserRole | undefined,
  canAccess: (key: AdminAccessKey) => boolean,
): boolean {
  const rule = getRouteAccessRule(pathname);
  if (!rule) {
    return true;
  }

  if (!roleMatchesAllowedRoles(role, rule.roles)) {
    return false;
  }

  return passesAdminAccessCheck(rule.access, {
    role,
    canAccess,
  });
}
