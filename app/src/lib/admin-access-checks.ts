import type { AdminAccessKey } from "@/lib/admin-access";
import type { UserRole } from "@/services/auth/types/auth.types";

export type AccessCheckContext = {
  role?: UserRole;
  canAccess: (key: AdminAccessKey) => boolean;
};

/** Normalize constant_token_admin to admin for allowlists. */
export function normalizeStaffRoleForAccess(
  role: UserRole | undefined,
): UserRole | undefined {
  if (role === "constant_token_admin") {
    return "admin";
  }
  return role;
}

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

  if (role === "vendor_admin" || role === "store_admin") {
    return allowedRoles.includes("vendor_admin") || allowedRoles.includes("store_admin");
  }

  const effectiveRole = normalizeStaffRoleForAccess(role);

  return (
    !!effectiveRole &&
    (allowedRoles.includes(effectiveRole) ||
      (role === "constant_token_admin" && allowedRoles.includes("admin")))
  );
}

export function passesAdminAccessCheck(
  adminAccessKey: AdminAccessKey | undefined,
  options: AccessCheckContext,
): boolean {
  if (!adminAccessKey) {
    return true;
  }

  return options.canAccess(adminAccessKey);
}

export function canSeeProtectedLink(
  options: AccessCheckContext & {
    roles?: readonly string[];
    adminAccess?: AdminAccessKey;
  },
): boolean {
  if (!roleMatchesAllowedRoles(options.role, options.roles)) {
    return false;
  }

  return passesAdminAccessCheck(options.adminAccess, options);
}
