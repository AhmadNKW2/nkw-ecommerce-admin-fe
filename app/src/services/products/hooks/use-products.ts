/**
 * Product Query Hooks
 * Custom hooks for products using TanStack Query
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { productService } from "../api/product.service";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import {
  Product,
  ProductDetail,
  CreateProductDto,
  UpdateProductDto,
  BulkReviewReimportAiDto,
  ProductFilters,
  ProductImportJobStart,
  ProductNamesFilters,
  ProductNameSummary,
  ProductStatus,
  RestoreProductDto,
} from "../types/product.types";
import {
  ApiResponse,
  PaginatedResponse,
  ApiError,
} from "../../../types/common.types";

/**
 * Hook to fetch products list with pagination and filters
 */
export function useProducts(
  params?: ProductFilters,
  options?: Omit<
    UseQueryOptions<
      ApiResponse<PaginatedResponse<Product>>,
      ApiError,
      ApiResponse<PaginatedResponse<Product>>,
      ReturnType<typeof queryKeys.products.list>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productService.getProducts(params),
    refetchOnMount: true,
    staleTime: 0,
    ...options,
  });
}

export function useProductNames(
  params?: ProductNamesFilters,
  options?: Omit<
    UseQueryOptions<
      ApiResponse<ProductNameSummary[]>,
      ApiError,
      ApiResponse<ProductNameSummary[]>,
      ReturnType<typeof queryKeys.products.namesList>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.products.namesList(params),
    queryFn: () => productService.getProductNames(params),
    refetchOnMount: true,
    staleTime: 0,
    ...options,
  });
}

/**
 * Hook to fetch a single product
 */
export function useProduct(
  id: string | number,
  options?: Omit<
    UseQueryOptions<
      ApiResponse<ProductDetail>,
      ApiError,
      ApiResponse<ProductDetail>,
      ReturnType<typeof queryKeys.products.detail>
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productService.getProduct(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to fetch archived products
 */
export function useArchivedProducts(
  options?: Omit<
    UseQueryOptions<
      ApiResponse<Product[]>,
      ApiError,
      ApiResponse<Product[]>,
      readonly ["products", "archived"]
    >,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: queryKeys.products.archived,
    queryFn: () => productService.getArchivedProducts(),
    ...options,
  });
}

/**
 * Hook to create a product
 */
export function useCreateProduct(
  options?: UseMutationOptions<
    ApiResponse<{ product: Product }>,
    ApiError,
    CreateProductDto
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDto) => productService.createProduct(data),
    onSuccess: (...args) => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      showSuccessToast("Product created successfully");

      // Call onSuccess from options if provided
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

/**
 * Hook to update a product
 */
export function useUpdateProduct(
  options?: UseMutationOptions<
    ApiResponse<Product>,
    ApiError,
    { id: string | number; data: UpdateProductDto }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => productService.updateProduct(id, data),
    onSuccess: (response, variables, ...rest) => {
      // Invalidate specific product and list
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      showSuccessToast("Product updated successfully");

      // Call onSuccess from options if provided
      options?.onSuccess?.(response, variables, ...rest);
    },
    ...options,
  });
}

/**
 * Hook to delete a product
 * @deprecated Use useArchiveProduct instead
 */
export function useDeleteProduct(
  options?: UseMutationOptions<ApiResponse<void>, ApiError, string | number>
) {
  return useArchiveProduct(options);
}

/**
 * Hook to archive a product
 */
export function useArchiveProduct(
  options?: UseMutationOptions<ApiResponse<void>, ApiError, string | number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => productService.archiveProduct(id),
    onSuccess: (...args) => {
      // Invalidate products list and archived list
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.archived });

      // Remove specific product from cache
      const [, variables] = args;
      queryClient.removeQueries({
        queryKey: queryKeys.products.detail(variables),
      });
      showSuccessToast("Product archived successfully");

      // Call onSuccess from options if provided
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

/**
 * Hook to restore an archived product
 */
export function useRestoreProduct(
  options?: UseMutationOptions<
    ApiResponse<Product>,
    ApiError,
    { id: string | number; data?: RestoreProductDto }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => productService.restoreProduct(id, data),
    onSuccess: (response, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.archived });
      showSuccessToast("Product restored successfully");

      options?.onSuccess?.(response, variables, ...rest);
    },
    ...options,
  });
}

/**
 * Hook to permanently delete a product
 */
export function usePermanentDeleteProduct(
  options?: UseMutationOptions<ApiResponse<void>, ApiError, string | number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | number) => productService.permanentDeleteProduct(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.archived });
      showSuccessToast("Product permanently deleted");

      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

/**
 * Hook to toggle product status
 */
export function useToggleProductStatus(
  options?: UseMutationOptions<
    ApiResponse<Product>,
    ApiError,
    { id: string | number; visible: boolean }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, visible }) =>
      productService.toggleProductStatus(id, visible),
    onSuccess: (response, variables, ...rest) => {
      // Invalidate specific product and list
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      showSuccessToast("Product status updated successfully");

      // Call onSuccess from options if provided
      options?.onSuccess?.(response, variables, ...rest);
    },
    ...options,
  });
}

/**
 * Hook to update product workflow status
 */
export function useUpdateProductWorkflowStatus(
  options?: UseMutationOptions<
    ApiResponse<Product>,
    ApiError,
    { id: string | number; status: ProductStatus }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) =>
      productService.updateProductWorkflowStatus(id, status),
    onSuccess: (response, variables, ...rest) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });
      showSuccessToast(
        variables.status === "active"
          ? "Product approved successfully"
          : "Product status updated successfully"
      );

      options?.onSuccess?.(response, variables, ...rest);
    },
    ...options,
  });
}

/**
 * Hook to re-run AI import for an existing product
 */
export function useReimportProductAi(
  options?: UseMutationOptions<ApiResponse<ProductImportJobStart>, ApiError, string | number>
) {
  return useMutation({
    mutationFn: (id: string | number) => productService.reimportProductAi(id),
    ...options,
  });
}

/**
 * Hook to start background AI re-import for the filtered review queue
 */
export function useBulkReviewReimportAi(
  options?: UseMutationOptions<ApiResponse<ProductImportJobStart>, ApiError, BulkReviewReimportAiDto>
) {
  return useMutation({
    mutationFn: (data: BulkReviewReimportAiDto) => productService.bulkReimportReviewProductsAi(data),
    ...options,
  });
}
