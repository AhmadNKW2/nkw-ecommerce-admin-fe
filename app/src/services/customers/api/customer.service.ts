/**
 * Customer/User API Service
 * Handles all user-related API calls for /api/users
 */

import { httpClient } from "../../../lib/api/http-client";
import {
  Customer,
  CustomerWithWishlist,
  CustomerListResponse,
  CustomerFilters,
  CreateCustomerDto,
  UpdateCustomerDto,
  WishlistItem,
} from "../types/customer.types";

class CustomerService {
  private endpoint = "/users";

  /**
   * Get all users with optional filters
   * GET /api/users
   */
  async getCustomers(filters?: CustomerFilters): Promise<CustomerListResponse> {
    if (!filters) {
      return httpClient.get<CustomerListResponse>(this.endpoint);
    }

    const { role, ...rest } = filters;
    const params: Record<string, unknown> = { ...rest };

    if (role) {
      params.roles = Array.isArray(role) ? role.join(",") : role;
    }

    return httpClient.get<CustomerListResponse>(this.endpoint, params);
  }

  /**
   * Get a single user by ID (with wishlist)
   * GET /api/users/:id
   */
  async getCustomer(id: number): Promise<CustomerWithWishlist> {
    const response = await httpClient.get<{ data: CustomerWithWishlist } | CustomerWithWishlist>(
      `${this.endpoint}/${id}`,
    );
    return (response as { data?: CustomerWithWishlist }).data ?? (response as CustomerWithWishlist);
  }

  /**
   * Create a new user
   * POST /api/users
   */
  async createCustomer(data: CreateCustomerDto): Promise<Customer> {
    return httpClient.post<Customer>(this.endpoint, data);
  }

  /**
   * Update a user
   * PATCH /api/users/:id
   */
  async updateCustomer(id: number, data: UpdateCustomerDto): Promise<Customer> {
    return httpClient.patch<Customer>(`${this.endpoint}/${id}`, data);
  }

  /**
   * Delete a user
   * DELETE /api/users/:id
   */
  async deleteCustomer(id: number): Promise<void> {
    return httpClient.delete<void>(`${this.endpoint}/${id}`);
  }

  /**
   * Add a product to user's wishlist
   * POST /api/users/:id/wishlist
   */
  async addToWishlist(userId: number, productId: number): Promise<WishlistItem> {
    return httpClient.post<WishlistItem>(`${this.endpoint}/${userId}/wishlist`, {
      product_id: productId,
    });
  }

  /**
   * Remove a product from user's wishlist
   * DELETE /api/users/:id/wishlist/:productId
   */
  async removeFromWishlist(userId: number, productId: number): Promise<void> {
    return httpClient.delete<void>(`${this.endpoint}/${userId}/wishlist/${productId}`);
  }
}

export const customerService = new CustomerService();
