"use client";

/**
 * Create User Page Component
 * Shared component for creating users (customers and admins)
 */

import { useState, useMemo } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useCreateCustomer } from "../../services/customers/hooks/use-customers";
import { useVendors } from "../../services/vendors/hooks/use-vendors";
import { UserForm } from "./UserForm";
import { validateCustomerForm } from "../../lib/validations/customer.schema";
import { UserRole } from "../../services/customers/types/customer.types";
import { createDefaultAdminAccess, constrainAdminAccessByFeatureToggles, getDefaultAdminAccessForRole } from "../../lib/admin-access";
import type { AdminAccess } from "../../lib/admin-access";
import { useResolvedFeatureToggles } from "../../hooks/use-resolved-feature-toggles";

export interface CreateUserPageProps {
  userType: "customer" | "admin";
}

export const CreateUserPage: React.FC<CreateUserPageProps> = ({ userType }) => {
  const router = useRouter();

  const isAdmin = userType === "admin";
  const [role, setRole] = useState<UserRole>(isAdmin ? "admin" : "user");
  const basePath = isAdmin ? "/admins" : "/customers";
  const label = isAdmin ? "Admin" : "Customer";

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [adminAccess, setAdminAccess] = useState<AdminAccess>(createDefaultAdminAccess());
  const [productIds, setProductIds] = useState<number[]>([]);
  const [formErrors, setFormErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: string;
    vendorId?: string;
  }>({});

  const createCustomer = useCreateCustomer();
  const { isEnabled } = useResolvedFeatureToggles();
  const { data: vendorsData } = useVendors({ limit: 1000 });

  const vendorOptions = useMemo(
    () =>
      vendorsData?.data?.map((vendor) => ({
        value: vendor.id.toString(),
        label: vendor.name_en,
      })) || [],
    [vendorsData],
  );

  const validate = () => {
    const result = validateCustomerForm(
      {
        firstName,
        lastName,
        email,
        password,
        role,
      },
      true // isCreate = true, password is required
    );

    if (!result.isValid) {
      setFormErrors(result.errors);
      return false;
    }

    if ((role === "vendor_admin" || role === "store_admin") && !vendorId) {
      setFormErrors((prev) => ({ ...prev, vendorId: "Vendor is required" }));
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
      await createCustomer.mutateAsync({
        firstName,
        lastName,
        email,
        password,
        role,
        vendor_id:
          role === "vendor_admin" || role === "store_admin"
            ? Number(vendorId)
            : undefined,
        product_ids: productIds.length > 0 ? productIds : undefined,
        adminAccess: isAdmin
          ? constrainAdminAccessByFeatureToggles(adminAccess, isEnabled)
          : undefined,
      });

      router.push(basePath);
    } catch (error) {
      console.error(`Failed to create ${label.toLowerCase()}:`, error);
    }
  };

  return (
    <UserForm
      mode="create"
      userType={userType}
      backUrl={basePath}
      firstName={firstName}
      lastName={lastName}
      email={email}
      password={password}
      role={role}
      vendorId={vendorId}
      isActive={isActive}
      productIds={productIds}
      assignedProducts={[]}
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
      onPasswordChange={(value) => {
        setPassword(value);
        if (formErrors.password) {
          setFormErrors((prev) => ({ ...prev, password: undefined }));
        }
      }}
      onRoleChange={(value) => {
        setRole(value);
        if (formErrors.role) {
          setFormErrors((prev) => ({ ...prev, role: undefined }));
        }
        if (value !== "vendor_admin" && value !== "store_admin") {
          setVendorId("");
        }
        if (isAdmin) {
          setAdminAccess(getDefaultAdminAccessForRole(value));
        }
      }}
      onVendorIdChange={(value) => {
        setVendorId(value);
        if (formErrors.vendorId) {
          setFormErrors((prev) => ({ ...prev, vendorId: undefined }));
        }
      }}
      vendorOptions={vendorOptions}
      onIsActiveChange={setIsActive}
      adminAccess={isAdmin ? adminAccess : undefined}
      onAdminAccessChange={isAdmin ? setAdminAccess : undefined}
      onProductIdsChange={setProductIds}
      formErrors={formErrors}
      onSubmit={handleSubmit}
      isSubmitting={createCustomer.isPending}
      submitButtonText={`Create ${label}`}
    />
  );
};
