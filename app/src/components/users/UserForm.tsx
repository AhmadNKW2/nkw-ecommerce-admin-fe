"use client";

/**
 * User Form Component
 * Reusable form for creating and editing users (customers and admins)
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import Image from "next/image";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Toggle } from "../ui/toggle";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { PageHeader } from "../common/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Users, Heart, Package, Pencil, Shield } from "lucide-react";
import { UserRole, WishlistItem } from "../../services/customers/types/customer.types";
import {
  ADMIN_ACCESS_KEYS,
  ADMIN_ACCESS_LABELS,
  constrainAdminAccessByFeatureToggles,
  getAdminAccessKeysVisibleByFeatureToggle,
  type AdminAccess,
} from "../../lib/admin-access";
import { useResolvedFeatureToggles } from "../../hooks/use-resolved-feature-toggles";
import { ProductSelectionModal } from "../common/ProductSelectionModal";
import { ProductItem } from "../common/ProductsTableSection";
import { OrdersTableSection } from "../common/OrdersTableSection";
import type { Order } from "../../services/orders/types/order.types";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";
import { CustomerProfileSections } from "./CustomerProfileSections";
import type {
  CustomerAddress,
  CustomerCart,
  CustomerWallet,
  WalletTransaction,
} from "../../services/customers/types/customer.types";

interface UserFormProps {
  mode: "create" | "edit";
  userType: "customer" | "admin";
  backUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  vendorId?: string;
  isActive: boolean;
  productIds?: number[];
  assignedProducts?: ProductItem[];
  wishlist?: WishlistItem[];
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: UserRole) => void;
  onVendorIdChange?: (value: string) => void;
  vendorOptions?: Array<{ value: string; label: string }>;
  onIsActiveChange: (value: boolean) => void;
  adminAccess?: AdminAccess;
  onAdminAccessChange?: (value: AdminAccess) => void;
  onProductIdsChange?: (productIds: number[]) => void;
  onWishlistChange?: (productIds: number[]) => void;
  isUpdatingWishlist?: boolean;
  orders?: Order[];
  addresses?: CustomerAddress[];
  cart?: CustomerCart;
  wallet?: CustomerWallet;
  transactions?: WalletTransaction[];
  formErrors: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
    vendorId?: string;
  };
  onPhoneChange?: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText: string;
}

const roleOptions = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const adminRoleOptions = [
  { value: "admin", label: "Admin" },
  { value: "catalog_manager", label: "Catalog Manager" },
  { value: "vendor_admin", label: "Vendor Admin" },
  { value: "store_admin", label: "Store Admin" },
];

export const UserForm: React.FC<UserFormProps> = ({
  mode,
  userType,
  backUrl,
  firstName,
  lastName,
  email,
  phone = "",
  password,
  role,
  vendorId = "",
  isActive,
  productIds = [],
  assignedProducts = [],
  wishlist = [],
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange,
  onRoleChange,
  onVendorIdChange,
  vendorOptions = [],
  onIsActiveChange,
  adminAccess,
  onAdminAccessChange,
  onProductIdsChange,
  onWishlistChange,
  isUpdatingWishlist = false,
  orders = [],
  addresses = [],
  cart,
  wallet,
  transactions = [],
  formErrors,
  onPhoneChange,
  onSubmit,
  isSubmitting,
  submitButtonText,
}) => {
  const router = useRouter();
  useEnterToSubmit(onSubmit, isSubmitting);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // Get wishlist product IDs for the modal
  const wishlistProductIds = useMemo(
    () => wishlist.map((item) => item.product_id),
    [wishlist]
  );

  const handleBack = () => {
    router.push(backUrl);
  };

  const handleWishlistChange = (newProductIds: number[]) => {
    if (onWishlistChange) {
      onWishlistChange(newProductIds);
    }
  };

  const isAdmin = userType === "admin";
  const { isResolved: featureTogglesResolved, isEnabled } = useResolvedFeatureToggles();
  const visibleAdminAccessKeys = useMemo(
    () =>
      featureTogglesResolved
        ? getAdminAccessKeysVisibleByFeatureToggle(isEnabled)
        : [],
    [featureTogglesResolved, isEnabled],
  );

  useEffect(() => {
    if (!isAdmin || !adminAccess || !onAdminAccessChange || !featureTogglesResolved) {
      return;
    }

    const constrained = constrainAdminAccessByFeatureToggles(adminAccess, isEnabled);
    const hasDisabledAccess = ADMIN_ACCESS_KEYS.some(
      (key) => constrained[key] !== adminAccess[key],
    );

    if (hasDisabledAccess) {
      onAdminAccessChange(constrained);
    }
  }, [isAdmin, adminAccess, onAdminAccessChange, featureTogglesResolved, isEnabled]);

  const Icon = isAdmin ? Shield : Users;
  const title = mode === "create" 
    ? `Create ${isAdmin ? "Admin" : "Customer"}` 
    : `Edit ${isAdmin ? "Admin" : "Customer"}`;
  const description = mode === "create"
    ? `Add a new ${isAdmin ? "admin user" : "customer"}`
    : `Update ${isAdmin ? "admin" : "customer"} details`;

  return (
    <div className="admin-page">
      {/* Header */}
      <PageHeader
        icon={<Icon />}
        title={title}
        description={description}
        cancelAction={{
          label: "Cancel",
          onClick: handleBack,
          disabled: isSubmitting,
        }}
        action={{
          label: isSubmitting ? "Saving..." : submitButtonText,
          onClick: onSubmit,
          disabled: isSubmitting,
        }}
      />

      {/* Form */}
      <Card>
        <h2 className="text-lg font-semibold">{isAdmin ? "Admin" : "Customer"} Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* First Name */}
          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            error={formErrors.firstName}
            required
            maxLength={50}
          />

          {/* Last Name */}
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            error={formErrors.lastName}
            required
            maxLength={50}
          />

          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            error={formErrors.email}
            required
          />

          {/* Phone */}
          {mode === "edit" && onPhoneChange ? (
            <Input
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              error={formErrors.phone}
              placeholder="+962..."
            />
          ) : null}

          {/* Password - only shown on create */}
          {mode === "create" && (
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              error={formErrors.password}
              required
              maxLength={100}
            />
          )}

          {/* Role - hidden input for admin type, shows select for customer type */}
          {!isAdmin ? (
            <Select
              label="Role"
              value={role}
              onChange={(value) => onRoleChange(value as UserRole)}
              options={roleOptions}
              disabled={userType === 'customer'}
            />
          ) : (
            <Select
              label="Admin Type"
              value={role}
              onChange={(value) => onRoleChange(value as UserRole)}
              options={adminRoleOptions}
            />
          )}

          {isAdmin && (role === "vendor_admin" || role === "store_admin") ? (
            <Select
              label="Linked Vendor"
              value={vendorId}
              onChange={(value) =>
                onVendorIdChange?.(Array.isArray(value) ? value[0] ?? "" : value)
              }
              options={vendorOptions}
              error={formErrors.vendorId}
            />
          ) : null}

          {/* Active Status */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="font-medium">Active Status</p>
              <p className="text-sm text-gray-500">
                Inactive users cannot log in to their account
              </p>
            </div>
            <Toggle checked={isActive} onChange={onIsActiveChange} />
          </div>
        </div>
      </Card>

      {isAdmin && adminAccess && onAdminAccessChange && role !== "vendor_admin" && role !== "store_admin" ? (
        <Card>
          <h2 className="text-lg font-semibold">Admin Access</h2>
          <p className="mt-1 text-sm text-gray-500">
            Control which sections this admin can use. Product pricing also controls
            the pricing view and price fields on the product form. Sections disabled
            in Feature Settings are hidden here and cannot be granted.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {!featureTogglesResolved
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex animate-pulse items-center justify-between rounded-r1 border border-primary/15 bg-gray-50 px-4 py-3"
                    aria-hidden="true"
                  >
                    <div className="h-4 w-24 rounded bg-gray-200" />
                    <div className="h-6 w-11 rounded-full bg-gray-200" />
                  </div>
                ))
              : visibleAdminAccessKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-r1 border border-primary/15 bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{ADMIN_ACCESS_LABELS[key]}</p>
                    </div>
                    <Toggle
                      checked={adminAccess[key]}
                      onChange={(checked) =>
                        onAdminAccessChange({
                          ...adminAccess,
                          [key]: checked,
                        })
                      }
                    />
                  </div>
                ))}
          </div>
        </Card>
      ) : null}

      {/* Customer profile overview - edit mode only */}
      {!isAdmin && mode === "edit" ? (
        <CustomerProfileSections
          addresses={addresses}
          cart={cart}
          wallet={wallet}
          transactions={transactions}
        />
      ) : null}

      {/* Customer Orders Section - Only show for customers */}
      {!isAdmin && mode === 'edit' && (
        <OrdersTableSection
          orders={orders}
          title="Customer Orders"
        />
      )}

      {/* Wishlist Section - Only show in edit mode for customers */}
      {mode === "edit" && !isAdmin && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Heart className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Wishlist Products ({wishlist.length})</h2>
                <p className="text-sm text-gray-500">
                  Manage products in this customer&apos;s wishlist
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsProductModalOpen(true)}
              disabled={isUpdatingWishlist}
            >
              Edit Products
            </Button>
          </div>

          {/* Wishlist Table */}
          {wishlist.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No products in wishlist</p>
              <p className="text-sm text-gray-400 mt-1">
                Click &quot;Edit Products&quot; to add products to this customer&apos;s wishlist
              </p>
              <Button
                variant="outline"
                onClick={() => setIsProductModalOpen(true)}
                className="mt-3"
                disabled={isUpdatingWishlist}
              >
                Edit Products
              </Button>
            </div>
          ) : (
            <Table noPagination={true}>
              <TableHeader>
                <TableRow isHeader>
                  <TableHead>Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Vendor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wishlist.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                        {item.product?.image ? (
                          <Image
                            src={item.product.image}
                            alt={item.product.name_en}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-xs">
                          {item.product?.name_en || "Unknown Product"}
                        </span>
                        {item.product?.name_ar && (
                          <span className="text-sm text-gray-500 truncate" dir="rtl">
                            {item.product.name_ar}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {item.product?.sku || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.product?.vendor?.name_en || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Product Selection Modal for Wishlist */}
      <ProductSelectionModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        selectedProductIds={wishlistProductIds}
        onSelectionChange={handleWishlistChange}
        title="Manage Wishlist Products"
      />
    </div>
  );
};

// Export alias for backwards compatibility
export const CustomerForm = UserForm;
