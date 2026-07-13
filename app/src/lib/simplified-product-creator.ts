import type { UserRole } from "@/services/auth/types/auth.types";

export function isSimplifiedProductCreator(user?: {
  role?: UserRole;
  vendorId?: number | null;
} | null): boolean {
  if (!user?.role) {
    return false;
  }

  return user.role === "vendor_admin" || user.role === "store_admin";
}

export function getSimplifiedProductStatus(
  role?: UserRole,
): "vendor" | "store" {
  return role === "store_admin" ? "store" : "vendor";
}
