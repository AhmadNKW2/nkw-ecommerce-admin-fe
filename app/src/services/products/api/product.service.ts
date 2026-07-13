/**
 * Product API Service
 * Handles all product-related API calls including variants
 */

import { BaseService } from "../../../lib/api/base.service";
import {
  Product,
  ProductDetail,
  ProductFilters,
  ProductNamesFilters,
  ProductNameSummary,
  ProductStatus,
  ProductImportJobStart,
  ProductImportJobStatus,
  BulkReviewReimportAiDto,
  BulkUpdateProductStatusDto,
  BulkUpdateProductStatusResult,
  CreateProductDto,
  UpdateProductDto,
  ProductAttributeInput,
  SinglePricingInput,
  VariantPricingInput,
  MediaInput,
  VariantMediaInput,
  WeightInput,
  VariantWeightInput,
  StockInput,
  MediaManagementDto,
  AddProductAttributeInputDto,
  UpdateProductAttributeInputDto,
  UpdateSinglePricingDto,
  UpdateVariantPricingDto,
  UpdateWeightDto,
  UpdateVariantWeightDto,
  UpdateStockInputDto,
  UpdateMediaDto,
  DeleteMediaDto,
  ReorderMediaDto,
  RestoreProductDto,
  MergeDuplicateReferenceSlugsDto,
  MergeDuplicateReferenceSlugsResult,
} from "../types/product.types";
import {
  ApiResponse,
  PaginatedResponse,
  PaginatedApiResponse,
} from "../../../types/common.types";
import { httpClient } from "../../../lib/api/http-client";
import { getQueryClient } from "../../../lib/query-client";
import { queryKeys } from "../../../lib/query-keys";

const ADMIN_PRODUCTS_PROVIDER = (
  process.env.NEXT_PUBLIC_ADMIN_PRODUCTS_PROVIDER || "products"
).toLowerCase();

// Product Attributes
export interface ProductAttributeDto {
  attribute_id: number;
}

export interface AddProductAttributesDto {
  attributes: ProductAttributeDto[];
}

// Pricing
export interface SinglePricingDto {
  cost?: number;
  price: number;
  sale_price?: number;
}

export interface VariantPricingDto {
  attribute_value_id: number;
  cost?: number;
  price: number;
  sale_price?: number;
}

//  Product Creation DTOs
// Imported from types


// ==================== CREATE PRODUCT DTO ====================
// Imported from types


// Media
export interface ProductMediaDto {
  url: string;
  type: "image" | "video";
  sort_order: number;
  is_primary: boolean;
}

export interface VariantMediaDto {
  attribute_value_id: number;
  url: string;
  type: "image" | "video";
  sort_order: number;
  is_primary: boolean;
}

// Weight
export interface ProductWeightDto {
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface VariantWeightDto {
  attribute_value_id: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

// Stock
export interface UpdateStockDto {
  quantity: number;
}

// ==================== UPDATE PRODUCT DTOs ====================
// Imported from types




/**
 * The `/search` endpoint (Typesense-backed) validates its query params against a
 * strict allowlisted DTO (unknown properties are rejected with a 400). Its field
 * names also differ from the `/products` REST endpoint's `ProductFilters` shape,
 * so requests must be translated rather than passed through as-is.
 */
function mapProductFiltersToSearchParams(
  params: ProductFilters = {}
): Record<string, unknown> {
  const toBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  };

  const search = params.search?.trim();

  const mapped: Record<string, unknown> = {
    q: search || "*",
    page: params.page,
    limit: params.limit,
    ...(search ? {} : { sort_by: "created_at:desc" }),
    min_price: params.minPrice,
    max_price: params.maxPrice,
    in_stock: toBoolean(params.in_stock),
    category_id:
      typeof params.categoryId === "number" ? params.categoryId : undefined,
    category_ids: params.category_ids,
    vendor_id:
      typeof params.vendorId === "number"
        ? params.vendorId
        : typeof params.vendor_id === "number"
          ? params.vendor_id
          : undefined,
    vendor_ids: params.vendor_ids,
    brand_id: typeof params.brandId === "number" ? params.brandId : undefined,
    brand_ids: params.brand_ids,
    status: params.status,
    visible: toBoolean(params.visible),
    start_date: params.start_date,
    end_date: params.end_date,
    created_by: params.created_by,
    has_no_vendor: toBoolean(params.has_no_vendor),
    has_no_brand: toBoolean(params.has_no_brand),
    has_duplicate_reference_link: toBoolean(params.has_duplicate_reference_link),
    is_admin: true,
  };

  return Object.fromEntries(
    Object.entries(mapped).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  );
}

class ProductService extends BaseService<Product> {
  protected endpoint = "/products";

  /**
   * Get all products with filters and pagination
   */
    async getProducts(
    params?: ProductFilters
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    const endpoint =
      ADMIN_PRODUCTS_PROVIDER === "search" ? "/search" : this.endpoint;
    const requestParams =
      ADMIN_PRODUCTS_PROVIDER === "search"
        ? mapProductFiltersToSearchParams(params)
        : params;

    // Call the API
    const response = await httpClient.get<PaginatedApiResponse<Product>>(
      endpoint,
      requestParams
    );

    // Transform backend response (meta) to frontend format (pagination)
    return {
      success: response.success,
      message: response.message,
      data: {
        data: response.data,
        pagination: response.meta,
      },
    };
  }

  async getProductNames(
    params?: ProductNamesFilters
  ): Promise<ApiResponse<ProductNameSummary[]>> {
    return httpClient.get<ApiResponse<ProductNameSummary[]>>(
      `${this.endpoint}/names`,
      params
    );
  }

  /**
   * Get a single product by ID
   */
  async getProduct(id: string | number): Promise<ApiResponse<ProductDetail>> {
    return httpClient.get<ApiResponse<ProductDetail>>(`${this.endpoint}/${id}`);
  }


  /**
   * Create  product with all variant data in one request
   */
  async createProduct(
    data: CreateProductDto
  ): Promise<ApiResponse<{ product: Product }>> {
    const response = await httpClient.post<ApiResponse<{ product: Product }>>(
      `${this.endpoint}`,
      data,
      { headers: { "x-skip-request-toast": "1" } }
    );
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Create  product with files (FormData)
   */
  async createProductWithFiles(
    formData: FormData
  ): Promise<ApiResponse<Product>> {
    const response = await httpClient.postFormData<ApiResponse<Product>>(
      `${this.endpoint}/`,
      formData
    );
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Update a product (PUT - full update)
   */
  async updateProduct(
    id: string | number,
    data: UpdateProductDto
  ): Promise<ApiResponse<Product>> {
    const response = await httpClient.put<ApiResponse<Product>>(`${this.endpoint}/${id}`, data, {
      headers: { "x-skip-request-toast": "1" },
    });
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Archive a product (soft delete)
   */
  async archiveProduct(id: string | number): Promise<ApiResponse<void>> {
    const response = await httpClient.post<ApiResponse<void>>(`${this.endpoint}/${id}/archive`);
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Restore an archived product
   */
  async restoreProduct(id: string | number, data?: RestoreProductDto): Promise<ApiResponse<Product>> {
    const response = await httpClient.post<ApiResponse<Product>>(`${this.endpoint}/${id}/restore`, data);
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Get archived products (trash view)
   */
  async getArchivedProducts(): Promise<ApiResponse<Product[]>> {
    return httpClient.get<ApiResponse<Product[]>>(`${this.endpoint}/archive/list`);
  }

  /**
   * Permanently delete a product
   */
  async permanentDeleteProduct(id: string | number): Promise<ApiResponse<void>> {
    const response = await httpClient.delete<ApiResponse<void>>(`${this.endpoint}/${id}/permanent`);
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Delete a product (legacy - now archives instead)
   * @deprecated Use archiveProduct instead
   */
  async deleteProduct(id: string | number): Promise<ApiResponse<void>> {
    return this.archiveProduct(id);
  }

  /**
   * Toggle product active status
   */
  async toggleProductStatus(
    id: string | number,
    visible: boolean
  ): Promise<ApiResponse<Product>> {
    const response = await this.patch(id, { visible });
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Update product workflow status without sending a full product payload
   */
  async updateProductWorkflowStatus(
    id: string | number,
    status: ProductStatus
  ): Promise<ApiResponse<Product>> {
    const response = await this.patch(id, { status });
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Re-run AI import for an existing product using its saved import payload
   */
  async reimportProductAi(id: string | number): Promise<ApiResponse<ProductImportJobStart>> {
    return httpClient.post<ApiResponse<ProductImportJobStart>>(`${this.endpoint}/${id}/reimport-ai`, {});
  }

  /**
   * Start background AI re-import for review products matching a vendor/category pair
   */
  async bulkReimportReviewProductsAi(
    data: BulkReviewReimportAiDto
  ): Promise<ApiResponse<ProductImportJobStart>> {
    return httpClient.post<ApiResponse<ProductImportJobStart>>(`${this.endpoint}/review/reimport-ai`, data);
  }

  async bulkUpdateProductStatus(
    data: BulkUpdateProductStatusDto
  ): Promise<ApiResponse<BulkUpdateProductStatusResult>> {
    const response = await httpClient.patch<ApiResponse<BulkUpdateProductStatusResult>>(
      `${this.endpoint}/bulk-status`,
      data
    );
    getQueryClient().invalidateQueries({ queryKey: queryKeys.products.all });
    return response;
  }

  /**
   * Get background AI import job status
   */
  async getImportJobStatus(jobId: string): Promise<ApiResponse<ProductImportJobStatus>> {
    return httpClient.get<ApiResponse<ProductImportJobStatus>>(`${this.endpoint}/import-jobs/${jobId}`);
  }

  // ============================================
  // Product Attributes Management
  // ============================================

  /**
   * Add attributes to product
   */
  async addProductAttributes(
    product_id: number,
    data: AddProductAttributesDto
  ): Promise<ApiResponse<any>> {
    return httpClient.post(`${this.endpoint}/${product_id}/attributes`, data);
  }

  /**
   * Get product attributes
   */
  async getProductAttributes(product_id: number): Promise<ApiResponse<any>> {
    return httpClient.get(`${this.endpoint}/${product_id}/attributes`);
  }

  /**
   * Update product attribute
   */
  async updateProductAttribute(
    attributeId: number,
    data: Partial<ProductAttributeDto>
  ): Promise<ApiResponse<any>> {
    return httpClient.patch(`${this.endpoint}/attributes/${attributeId}`, data);
  }

  /**
   * Remove product attribute
   */
  async removeProductAttribute(attributeId: number): Promise<ApiResponse<void>> {
    return httpClient.delete(`${this.endpoint}/attributes/${attributeId}`);
  }

  // ============================================
  // Product Pricing Management
  // ============================================

  /**
   * Set single pricing
   */
  async setSinglePricing(
    product_id: number,
    data: SinglePricingDto
  ): Promise<ApiResponse<any>> {
    return httpClient.post(`${this.endpoint}/${product_id}/pricing`, data);
  }

  /**
   * Set variant pricing
   */
  async setVariantPricing(
    product_id: number,
    data: VariantPricingDto
  ): Promise<ApiResponse<any>> {
    return httpClient.post(`${this.endpoint}/${product_id}/variant-pricing`, data);
  }

  /**
   * Get product pricing
   */
  async getProductPricing(product_id: number): Promise<ApiResponse<any>> {
    return httpClient.get(`${this.endpoint}/${product_id}/pricing`);
  }

  /**
   * Get variant pricing
   */
  async getVariantPricing(product_id: number): Promise<ApiResponse<any[]>> {
    return httpClient.get(`${this.endpoint}/${product_id}/variant-pricing`);
  }

  // ============================================
  // Product Media Management
  // ============================================

  /**
   * Add product media
   */
  async addProductMedia(
    product_id: number,
    data: ProductMediaDto
  ): Promise<ApiResponse<any>> {
    return httpClient.post(`${this.endpoint}/${product_id}/media`, data);
  }

  /**
   * Upload product media file (unified endpoint)
   * - Without variantId: saves as general product media
   * - With variantId: saves as variant-specific media
   */
  async uploadProductMedia(
    product_id: number,
    file: File,
    sortOrder?: number,
    isPrimary?: boolean,
    variantId?: number
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    if (sortOrder !== undefined) formData.append('sort_order', sortOrder.toString());
    if (isPrimary !== undefined) formData.append('is_primary', isPrimary.toString());
    if (variantId !== undefined) formData.append('variant_id', variantId.toString());
    
    return httpClient.postFormData(`${this.endpoint}/${product_id}/media`, formData);
  }

  /**
   * Upload variant media file using variant_id
   * Uses the unified media endpoint with variant_id parameter
   */
  async uploadVariantMedia(
    product_id: number,
    variantId: number,
    file: File,
    sortOrder?: number,
    isPrimary?: boolean
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('variant_id', variantId.toString());
    if (sortOrder !== undefined) formData.append('sort_order', sortOrder.toString());
    if (isPrimary !== undefined) formData.append('is_primary', isPrimary.toString());
    
    return httpClient.postFormData(`${this.endpoint}/${product_id}/media`, formData);
  }

  /**
   * Get product media
   */
  async getProductMedia(product_id: number): Promise<ApiResponse<any>> {
    return httpClient.get(`${this.endpoint}/${product_id}/media`);
  }

  /**
   * Set primary media
   */
  async setPrimaryMedia(
    mediaId: number,
    isVariant: boolean
  ): Promise<ApiResponse<any>> {
    return httpClient.patch(`${this.endpoint}/media/${mediaId}/primary`, {
      is_variant: isVariant,
    });
  }

  /**
   * Delete media
   */
  async deleteMedia(
    mediaId: number,
    isVariant: boolean
  ): Promise<ApiResponse<void>> {
    return httpClient.delete(
      `${this.endpoint}/media/${mediaId}?is_variant=${isVariant}`
    );
  }

  // ============================================
  // Product Weight Management
  // ============================================

  /**
   * Set product weight
   */
  async setProductWeight(
    product_id: number,
    data: ProductWeightDto
  ): Promise<ApiResponse<any>> {
    return httpClient.post(`${this.endpoint}/${product_id}/weight`, data);
  }

  /**
   * Set variant weight
   */
  async setVariantWeight(
    product_id: number,
    data: VariantWeightDto
  ): Promise<ApiResponse<any>> {
    return httpClient.post(`${this.endpoint}/${product_id}/variant-weight`, data);
  }

  /**
   * Get product weight
   */
  async getProductWeight(product_id: number): Promise<ApiResponse<any>> {
    return httpClient.get(`${this.endpoint}/${product_id}/weight`);
  }

  /**
   * Get variant weights
   */
  async getVariantWeights(product_id: number): Promise<ApiResponse<any[]>> {
    return httpClient.get(`${this.endpoint}/${product_id}/variant-weights`);
  }

  // ============================================
  // Product Stock Management
  // ============================================

  /**
   * Get product stock
   */
  async getProductStock(product_id: number): Promise<ApiResponse<any[]>> {
    return httpClient.get(`${this.endpoint}/${product_id}/stock`);
  }

  /**
   * Update stock quantity
   */
  async updateStockQuantity(
    stockId: number,
    data: UpdateStockDto
  ): Promise<ApiResponse<any>> {
    return httpClient.patch(`${this.endpoint}/stock/${stockId}`, data);
  }

  // ============================================
  // Product Category Assignment
  // ============================================

  /**
   * Assign products to a category
   */
  async assignToCategory(categoryId: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.post<ApiResponse<void>>(`${this.endpoint}/assign/category/${categoryId}`, { product_ids });
  }

  /**
   * Remove products from a category
   */
  async removeFromCategory(categoryId: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.delete<ApiResponse<void>>(`${this.endpoint}/assign/category/${categoryId}`, { product_ids });
  }

  // ============================================
  // Product Vendor Assignment
  // ============================================

  /**
   * Assign products to a vendor
   */
  async assignToVendor(vendorId: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.post<ApiResponse<void>>(`${this.endpoint}/assign/vendor/${vendorId}`, { product_ids });
  }

  /**
   * Remove products from a vendor
   */
  async removeFromVendor(vendorId: number, product_ids: number[]): Promise<ApiResponse<void>> {
    return httpClient.delete<ApiResponse<void>>(`${this.endpoint}/assign/vendor/${vendorId}`, { product_ids });
  }

  async getProductByReference(params: {
    reference_link?: string;
    reference_slug?: string;
  }): Promise<ApiResponse<ProductDetail>> {
    const searchParams = new URLSearchParams();
    if (params.reference_link?.trim()) {
      searchParams.set("reference_link", params.reference_link.trim());
    }
    if (params.reference_slug?.trim()) {
      searchParams.set("reference_slug", params.reference_slug.trim());
    }
    const query = searchParams.toString();
    return httpClient.get<ApiResponse<ProductDetail>>(
      `${this.endpoint}/reference-link${query ? `?${query}` : ""}`,
    );
  }

  async mergeDuplicateReferenceSlugs(
    data: MergeDuplicateReferenceSlugsDto,
  ): Promise<ApiResponse<MergeDuplicateReferenceSlugsResult>> {
    return httpClient.post<ApiResponse<MergeDuplicateReferenceSlugsResult>>(
      `${this.endpoint}/merge-duplicate-reference-slugs`,
      data,
    );
  }
}

export const productService = new ProductService();
