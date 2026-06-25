/**
 * Customer/User Types
 * Matches the backend API structure for /api/users
 */

import { z } from "zod";

// Wishlist Product (nested in user detail)
export interface WishlistProduct {
  id: number;
  name_en: string;
  name_ar: string;
  sku: string;
  short_description_en?: string;
  short_description_ar?: string;
  long_description_en?: string;
  long_description_ar?: string;
  status: string;
  visible: boolean;
  image?: string;
  average_rating?: number;
  total_ratings?: number;
  created_at?: string;
  vendor?: {
    id: number;
    name_en: string;
    name_ar: string;
    logo?: string;
  };
  category?: {
    id: number;
    name_en: string;
    name_ar: string;
  };
  categories?: Array<{
    id: number;
    name_en: string;
    name_ar: string;
  }>;
  media?: Array<{
    id: number;
    url: string;
    type: string;
    is_primary: boolean;
  }>;
}

// Wishlist Item
export interface WishlistItem {
  id: number;
  product_id: number;
  added_at: string;
  product: WishlistProduct;
}

// User Role
export type UserRole = "user" | "admin" | "constant_token_admin" | "catalog_manager";

// Customer/User Schema (matches backend /api/users)
export const customerSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional().nullable(),
  role: z.enum(["user", "admin", "constant_token_admin", "catalog_manager"]).default("user"),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export type Customer = z.infer<typeof customerSchema>;

// Customer with full profile (detail response)
export interface CustomerAddress {
  id: number;
  title: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerCartItem {
  id: number;
  product_id: number;
  variant_id?: number | null;
  quantity: number;
  product?: {
    id: number;
    name_en: string;
    name_ar: string;
    price: number;
    sale_price?: number | null;
    image?: string;
  };
}

export interface CustomerCart {
  id: number | null;
  user_id: number;
  items: CustomerCartItem[];
  total_amount: number;
}

export interface CustomerWallet {
  balance: number;
  totalCashback: number;
}

export interface WalletTransaction {
  id: number;
  type: "credit" | "debit";
  source: string;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export interface CustomerOrderSummary {
  id: number;
  status: string;
  paymentMethod?: string;
  totalAmount: number;
  createdAt: string;
  items?: Array<{ id: number; quantity: number; product?: { name_en?: string } }>;
}

export interface CustomerWithWishlist extends Customer {
  wishlist?: WishlistItem[];
  addresses?: CustomerAddress[];
  cart?: CustomerCart;
  wallet?: CustomerWallet;
  transactions?: WalletTransaction[];
  orders?: CustomerOrderSummary[];
}

// Customer List Response (matches GET /api/users)
export interface CustomerListResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Customer Filters (matches query parameters)
export interface CustomerFilters {
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "email" | "firstName" | "lastName";
  sortOrder?: "ASC" | "DESC";
  role?: UserRole | UserRole[];
  isActive?: boolean;
  search?: string;
}

// Create Customer DTO (matches POST /api/users)
export interface CreateCustomerDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: UserRole;
  product_ids?: number[];
}

// Update Customer DTO (matches PATCH /api/users/:id)
export interface UpdateCustomerDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
  product_ids?: number[];
}

// Helper to get full name
export function getCustomerFullName(customer: Customer): string {
  return `${customer.firstName} ${customer.lastName}`.trim();
}
