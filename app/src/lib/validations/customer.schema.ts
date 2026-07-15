/**
 * Customer/User Validation Schema
 * Shared validation for user forms (matches /api/users)
 */

import { z } from "zod";

// ============================================
// Customer/User Form Schema
// ============================================
export const customerFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters"),
  
  lastName: z
    .string()
    .min(1, "Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters"),
  
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  
  role: z
    .enum([
      "user",
      "admin",
      "constant_token_admin",
      "catalog_manager",
      "vendor_admin",
      "store_admin",
    ])
    .default("user"),
  
  isActive: z.boolean().default(true),
});

// Create user schema (password required)
export const createCustomerSchema = customerFormSchema.extend({
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

// Update user schema (allows partial updates, password not included)
export const updateCustomerSchema = customerFormSchema.omit({ password: true }).partial();

// Type inference
export type CustomerFormData = z.infer<typeof customerFormSchema>;
export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>;

// ============================================
// Validation Helper for Simple Forms
// ============================================
export interface CustomerFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: string;
}

/**
 * Validates user form data and returns errors object
 */
export function validateCustomerForm(
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role?: string;
  },
  isCreate: boolean = false
): { isValid: boolean; errors: CustomerFormErrors } {
  const errors: CustomerFormErrors = {};

  // First Name validation
  if (!data.firstName || !data.firstName.trim()) {
    errors.firstName = "First name is required";
  } else if (data.firstName.length < 2) {
    errors.firstName = "First name must be at least 2 characters";
  } else if (data.firstName.length > 50) {
    errors.firstName = "First name must be less than 50 characters";
  }

  // Last Name validation
  if (!data.lastName || !data.lastName.trim()) {
    errors.lastName = "Last name is required";
  } else if (data.lastName.length < 2) {
    errors.lastName = "Last name must be at least 2 characters";
  } else if (data.lastName.length > 50) {
    errors.lastName = "Last name must be less than 50 characters";
  }

  // Email validation
  if (!data.email || !data.email.trim()) {
    errors.email = "Email is required";
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.email = "Please enter a valid email address";
    }
  }

  // Password validation (required for create only)
  if (isCreate) {
    if (!data.password || !data.password.trim()) {
      errors.password = "Password is required";
    } else if (data.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (data.password.length > 100) {
      errors.password = "Password must be less than 100 characters";
    }
  }

  // Role validation
  const allowedRoles = [
    "user",
    "admin",
    "constant_token_admin",
    "catalog_manager",
    "vendor_admin",
    "store_admin",
  ];
  if (data.role && !allowedRoles.includes(data.role)) {
    errors.role = "Invalid role selected";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
