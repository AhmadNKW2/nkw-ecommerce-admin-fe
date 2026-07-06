"use client";

/**
 * Edit User Page Component
 * Shared component for editing users (customers and admins)
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../../providers/loading-provider";
import {
  useCustomer,
  useUpdateCustomer,
  useUpdateUserWishlist,
} from "../../services/customers/hooks/use-customers";
import { UserForm } from "./UserForm";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { AlertCircle } from "lucide-react";
import { validateCustomerForm } from "../../lib/validations/customer.schema";
import { UserRole } from "../../services/customers/types/customer.types";
import {
  createDefaultAdminAccess,
  constrainAdminAccessByFeatureToggles,
  normalizeAdminAccess,
  type AdminAccess,
} from "../../lib/admin-access";
import { useResolvedFeatureToggles } from "../../hooks/use-resolved-feature-toggles";
import { ProductItem } from "../common/ProductsTableSection";
import type { Order } from "../../services/orders/types/order.types";

export interface EditUserPageProps {
  userType: "customer" | "admin";
  userId: number;
}

export const EditUserPage: React.FC<EditUserPageProps> = ({ userType, userId }) => {
  const router = useRouter();
  const { setShowOverlay } = useLoading();

  const isAdmin = userType === "admin";
  const role: UserRole = isAdmin ? "admin" : "user";
  const basePath = isAdmin ? "/admins" : "/customers";
  const label = isAdmin ? "Admin" : "Customer";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [adminAccess, setAdminAccess] = useState<AdminAccess>(createDefaultAdminAccess());
  const [productIds, setProductIds] = useState<number[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<ProductItem[]>([]);
  const [formErrors, setFormErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
  }>({});

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useCustomer(userId);

  const updateCustomer = useUpdateCustomer();
  const updateWishlist = useUpdateUserWishlist();
  const { isEnabled } = useResolvedFeatureToggles();

  const userOrders = useMemo<Order[]>(() => {
    if (!user?.orders) return [];
    return user.orders.map((order) => ({
      id: order.id,
      status: order.status as Order["status"],
      paymentMethod: order.paymentMethod,
      totalAmount: String(order.totalAmount),
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: 0,
        product: item.product
          ? {
              id: 0,
              name_en: item.product.name_en ?? "Unknown",
              name_ar: "",
              slug: "",
            }
          : undefined,
      })),
      createdAt: order.createdAt,
    }));
  }, [user?.orders]);

  const currentWishlistProductIds = useMemo(
    () => user?.wishlist?.map((item) => item.product_id) || [],
    [user?.wishlist],
  );

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setIsActive(user.isActive ?? true);
      if (isAdmin) {
        setAdminAccess(
          normalizeAdminAccess(
            (user as { adminAccess?: Partial<AdminAccess> }).adminAccess,
          ),
        );
      }
    }
  }, [user, isAdmin]);

  const validate = () => {
    const result = validateCustomerForm(
      {
        firstName,
        lastName,
        email,
        role,
      },
      false,
    );

    if (!result.isValid) {
      setFormErrors(result.errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      await updateCustomer.mutateAsync({
        id: userId,
        data: {
          firstName,
          lastName,
          email,
          phone: phone.trim() || null,
          role,
          isActive,
          product_ids: productIds.length > 0 ? productIds : undefined,
          adminAccess: isAdmin
            ? constrainAdminAccessByFeatureToggles(adminAccess, isEnabled)
            : undefined,
        },
      });

      router.push(basePath);
    } catch (submitError) {
      console.error(`Failed to update ${label.toLowerCase()}:`, submitError);
    }
  };

  const handleWishlistChange = async (newProductIds: number[]) => {
    if (isAdmin) return;
    try {
      await updateWishlist.mutateAsync({
        userId,
        currentProductIds: currentWishlistProductIds,
        newProductIds,
      });
    } catch (wishlistError) {
      console.error("Failed to update wishlist:", wishlistError);
    }
  };

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="mt-4 text-xl font-bold">Error Loading {label}</h3>
              <p className="mt-2 max-w-md mx-auto">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="mt-4 text-xl font-bold">{label} Not Found</h3>
              <p className="mt-2 max-w-md mx-auto">
                The {label.toLowerCase()} you&apos;re looking for doesn&apos;t exist.
              </p>
              <Button onClick={() => router.push(basePath)} className="mt-4">
                Back to {label}s
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <UserForm
      mode="edit"
      userType={userType}
      backUrl={basePath}
      firstName={firstName}
      lastName={lastName}
      email={email}
      phone={phone}
      password={password}
      role={role}
      isActive={isActive}
      productIds={productIds}
      assignedProducts={assignedProducts}
      wishlist={!isAdmin ? user.wishlist : undefined}
      addresses={!isAdmin ? user.addresses : undefined}
      cart={!isAdmin ? user.cart : undefined}
      wallet={!isAdmin ? user.wallet : undefined}
      transactions={!isAdmin ? user.transactions : undefined}
      onFirstNameChange={(value) => {
        setFirstName(value);
        if (formErrors.firstName) {
          setFormErrors((prev) => ({ ...prev, firstName: undefined }));
        }
      }}
      onLastNameChange={(value) => {
        setLastName(value);
        if (formErrors.lastName) {
          setFormErrors((prev) => ({ ...prev, lastName: undefined }));
        }
      }}
      onEmailChange={(value) => {
        setEmail(value);
        if (formErrors.email) {
          setFormErrors((prev) => ({ ...prev, email: undefined }));
        }
      }}
      onPhoneChange={(value) => {
        setPhone(value);
        if (formErrors.phone) {
          setFormErrors((prev) => ({ ...prev, phone: undefined }));
        }
      }}
      onPasswordChange={(value) => {
        setPassword(value);
        if (formErrors.password) {
          setFormErrors((prev) => ({ ...prev, password: undefined }));
        }
      }}
      onRoleChange={() => {}}
      onIsActiveChange={setIsActive}
      adminAccess={isAdmin ? adminAccess : undefined}
      onAdminAccessChange={isAdmin ? setAdminAccess : undefined}
      onProductIdsChange={setProductIds}
      onWishlistChange={!isAdmin ? handleWishlistChange : undefined}
      isUpdatingWishlist={!isAdmin ? updateWishlist.isPending : false}
      orders={!isAdmin ? userOrders : undefined}
      formErrors={formErrors}
      onSubmit={handleSubmit}
      isSubmitting={updateCustomer.isPending}
      submitButtonText="Save Changes"
    />
  );
};
