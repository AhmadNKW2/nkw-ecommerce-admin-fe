import type { AdminAccessKey } from "@/lib/admin-access";
import type { UserRole } from "@/services/auth/types/auth.types";

export type AccessCheckContext = {
  role?: UserRole;
  canAccess: (key: AdminAccessKey) => boolean;
};

export function roleMatchesAllowedRoles(
  role: UserRole | undefined,
  allowedRoles?: readonly string[],
): boolean {
  if (!allowedRoles) {
    return true;
  }

  if (!role) {
    return false;
  }

  const effectiveRole = role === "constant_token_admin" ? "admin" : role;

  return (
    allowedRoles.includes(effectiveRole) ||
    (role === "constant_token_admin" && allowedRoles.includes("admin"))
  );
}

export function passesAdminAccessCheck(
  adminAccessKey: AdminAccessKey | undefined,
  options: AccessCheckContext & { catalogManagerBypass?: boolean },
): boolean {
  if (!adminAccessKey) {
    return true;
  }

  if (options.role === "catalog_manager" && options.catalogManagerBypass) {
    return true;
  }

  return options.canAccess(adminAccessKey);
}

export function canSeeProtectedLink(
  options: AccessCheckContext & {
    roles?: readonly string[];
    adminAccess?: AdminAccessKey;
    catalogManagerBypass?: boolean;
  },
): boolean {
  if (!roleMatchesAllowedRoles(options.role, options.roles)) {
    return false;
  }

  return passesAdminAccessCheck(options.adminAccess, options);
}
