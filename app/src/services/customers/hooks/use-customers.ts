/**
 * React Query hooks for customers/users
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../api/customer.service";
import { queryKeys } from "../../../lib/query-keys";
import {
  CustomerFilters,
  CreateCustomerDto,
  UpdateCustomerDto,
} from "../types/customer.types";
import { showSuccessToast } from "../../../lib/toast";

export const useCustomers = (filters?: CustomerFilters) => {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => customerService.getCustomers(filters),
  });
};

export const useCustomer = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customerService.getCustomer(id),
    enabled: options?.enabled ?? true,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerDto) => customerService.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      showSuccessToast("User created successfully");
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerDto }) =>
      customerService.updateCustomer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.id),
      });
      showSuccessToast("User updated successfully");
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerService.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      showSuccessToast("User deleted successfully");
    },
  });
};

export const useAddToUserWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, productId }: { userId: number; productId: number }) =>
      customerService.addToWishlist(userId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.userId),
      });
      showSuccessToast("Product added to wishlist");
    },
  });
};

export const useRemoveFromUserWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, productId }: { userId: number; productId: number }) =>
      customerService.removeFromWishlist(userId, productId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.userId),
      });
      showSuccessToast("Product removed from wishlist");
    },
  });
};

/**
 * Hook to update user's wishlist by comparing current and new product IDs
 * Handles both adding and removing products in batch
 */
export const useUpdateUserWishlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      currentProductIds,
      newProductIds,
    }: {
      userId: number;
      currentProductIds: number[];
      newProductIds: number[];
    }) => {
      await customerService.updateCustomer(userId, {
        product_ids: newProductIds,
      });

      const currentSet = new Set(currentProductIds);
      const newSet = new Set(newProductIds);
      const toAdd = newProductIds.filter((id) => !currentSet.has(id));
      const toRemove = currentProductIds.filter((id) => !newSet.has(id));

      return { added: toAdd.length, removed: toRemove.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.userId),
      });
      
      if (result.added > 0 || result.removed > 0) {
        const messages: string[] = [];
        if (result.added > 0) {
          messages.push(`${result.added} product${result.added > 1 ? 's' : ''} added`);
        }
        if (result.removed > 0) {
          messages.push(`${result.removed} product${result.removed > 1 ? 's' : ''} removed`);
        }
        showSuccessToast(`Wishlist updated: ${messages.join(', ')}`);
      }
    },
  });
};
