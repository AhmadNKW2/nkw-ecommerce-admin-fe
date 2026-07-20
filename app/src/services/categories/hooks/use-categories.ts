/**
 * React Query hooks for categories
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "../api/category.service";
import { queryKeys } from "../../../lib/query-keys";
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  FilterCategoriesDto,
  ReorderCategoriesDto,
  RestoreCategoryDto,
  PermanentDeleteCategoryDto,
} from "../types/category.types";
import { showSuccessToast, showWarningToast } from "../../../lib/toast";

export const useCategories = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [queryKeys.categories.all],
    queryFn: () => categoryService.getCategoryTree(),
    select: (response) => response.data,
    enabled: options?.enabled ?? true,
  });
};

export const useCategoryTree = () => {
  return useQuery({
    queryKey: [queryKeys.categories.tree],
    queryFn: () => categoryService.getCategoryTree(),
    select: (response) => response.data,
  });
};

export const useMainCategories = () => {
  return useQuery({
    queryKey: [queryKeys.categories.main],
    queryFn: () => categoryService.getMainCategories(),
    select: (response) => response.data,
  });
};

export const useCategory = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoryService.getCategory(id),
    select: (response) => response.data,
    enabled: options?.enabled ?? true,
  });
};

export const useArchivedCategories = () => {
  return useQuery({
    queryKey: [queryKeys.categories.archived],
    queryFn: () => categoryService.getArchivedCategories(),
    select: (response) => response.data,
  });
};

export const useFilterCategories = () => {
  return useMutation({
    mutationFn: (filters: FilterCategoriesDto) =>
      categoryService.filterCategories(filters),
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryDto) => categoryService.createCategory(data),
    onSuccess: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.all] });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.main });
      showSuccessToast("Category created successfully");
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryDto }) =>
      categoryService.updateCategory(id, data),
    onSuccess: (_, variables) => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.all] });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.main });
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.detail(variables.id),
      });
      showSuccessToast("Category updated successfully");
    },
  });
};

export const useReorderCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderCategoriesDto) => categoryService.reorderCategories(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.all] });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.main });
      showSuccessToast("Categories reordered successfully");
    },
  });
};

export const useArchiveCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => categoryService.archiveCategory(id),
    onSuccess: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.all] });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.main });
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.archived] });
      showSuccessToast("Category archived successfully");
    },
  });
};

export const useRestoreCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: RestoreCategoryDto }) =>
      categoryService.restoreCategory(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.all] });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.tree });
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.main });
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.archived] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.all] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.archived] });
      
      const restoredProducts = result.data?.restoredProducts || 0;
      const skippedProducts = result.data?.skippedProducts || 0;
      const restoredSubcategories = (result.data?.restoredCategories || 1) - 1; // Subtract 1 for the main category
      
      // Always show category restored message
      showSuccessToast("Category restored successfully");
      
      // Show subcategories toast if any were restored
      if (restoredSubcategories > 0) {
        showSuccessToast(`${restoredSubcategories} subcategory(s) restored`);
      }
      
      // Handle product toasts based on conditions
      if (skippedProducts === 0 && restoredProducts > 0) {
        // All products restored, none skipped
        showSuccessToast("All products restored");
      } else if (skippedProducts > 0 && restoredProducts === 0) {
        // All products skipped, none restored
        showWarningToast("All products skipped because their vendors are still archived");
      } else if (skippedProducts > 0 && restoredProducts > 0) {
        // Some restored, some skipped - show both toasts
        showSuccessToast(`${restoredProducts} product(s) restored`);
        showWarningToast(`${skippedProducts} product(s) skipped because their vendors are still archived`);
      }
    },
  });
};

export const usePermanentDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: PermanentDeleteCategoryDto }) =>
      categoryService.permanentDeleteCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.categories.archived] });
      showSuccessToast("Category permanently deleted");
    },
  });
};

/**
 * @deprecated Use useArchiveCategory instead
 */
export const useDeleteCategory = () => {
  return useArchiveCategory();
};

// ============================================
// Category Products Hooks
// ============================================

export const useCategoryProducts = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.categories.products(id),
    queryFn: () => categoryService.getProducts(id),
    select: (response) => response.data,
    enabled: options?.enabled ?? !!id,
  });
};

export const useCategoryVendorCategories = (
  id: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.categories.vendorCategories(id),
    queryFn: () => categoryService.getVendorCategories(id),
    select: (response) => response.data,
    enabled: options?.enabled ?? !!id,
  });
};

export const useAssignProductsToCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, product_ids }: { categoryId: number; product_ids: number[] }) =>
      categoryService.assignProducts(categoryId, product_ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.products(variables.categoryId) });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.all] });
      showSuccessToast("Products assigned to category successfully");
    },
  });
};

export const useRemoveProductsFromCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, product_ids }: { categoryId: number; product_ids: number[] }) =>
      categoryService.removeProducts(categoryId, product_ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.products(variables.categoryId) });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.all] });
      showSuccessToast("Products removed from category successfully");
    },
  });
};
