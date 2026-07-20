/**
 * React Query hooks for brands (mirrors vendor flows)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brandService } from "../api/brand.service";
import { queryKeys } from "../../../lib/query-keys";
import {
  BrandQueryParams,
  CreateBrandDto,
  UpdateBrandDto,
  ReorderBrandsDto,
  PermanentDeleteBrandDto,
  RestoreBrandDto,
} from "../types/brand.types";
import { showSuccessToast } from "../../../lib/toast";

export const useBrands = (
  params?: BrandQueryParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.brands.list(params),
    queryFn: () => brandService.getBrands(params),
    enabled: options?.enabled ?? true,
  });
};

export const useBrand = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.brands.detail(id),
    queryFn: () => brandService.getBrand(id),
    select: (response) => response.data,
    enabled: options?.enabled ?? true,
  });
};

export const useArchivedBrands = () => {
  return useQuery({
    queryKey: [queryKeys.brands.archived],
    queryFn: () => brandService.getArchivedBrands(),
    select: (response) => response.data,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBrandDto) => brandService.createBrand(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.all] });
      showSuccessToast("Brand created successfully");
    },
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBrandDto }) =>
      brandService.updateBrand(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.all] });
      queryClient.invalidateQueries({
        queryKey: queryKeys.brands.detail(variables.id),
      });
      showSuccessToast("Brand updated successfully");
    },
  });
};

export const useReorderBrands = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderBrandsDto) => brandService.reorderBrands(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.all] });
      showSuccessToast("Brands reordered successfully");
    },
  });
};

export const useArchiveBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => brandService.archiveBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.all] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.archived] });
      showSuccessToast("Brand archived successfully");
    },
  });
};

export const useRestoreBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: RestoreBrandDto }) =>
      brandService.restoreBrand(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.all] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.archived] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.all] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.archived] });
      const restoredProducts = result.data?.restoredProducts || 0;
      const message = restoredProducts > 0
        ? `Brand restored with ${restoredProducts} product(s)`
        : "Brand restored successfully";
      showSuccessToast(message);
    },
  });
};

export const usePermanentDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data?: PermanentDeleteBrandDto }) =>
      brandService.permanentDeleteBrand(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.brands.archived] });
      showSuccessToast("Brand permanently deleted");
    },
  });
};

/**
 * @deprecated Use useArchiveBrand instead
 */
export const useDeleteBrand = () => {
  return useArchiveBrand();
};

// ============================================
// Brand Products Hooks
// ============================================

export const useBrandProducts = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.brands.products(id),
    queryFn: () => brandService.getProducts(id),
    select: (response) => response.data,
    enabled: options?.enabled ?? !!id,
  });
};

export const useAssignProductsToBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, product_ids }: { brandId: number; product_ids: number[] }) =>
      brandService.assignProducts(brandId, product_ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.products(variables.brandId) });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.all] });
      showSuccessToast("Products assigned to brand successfully");
    },
  });
};

export const useRemoveProductsFromBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, product_ids }: { brandId: number; product_ids: number[] }) =>
      brandService.removeProducts(brandId, product_ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands.products(variables.brandId) });
      queryClient.invalidateQueries({ queryKey: [queryKeys.products.all] });
      showSuccessToast("Products removed from brand successfully");
    },
  });
};
