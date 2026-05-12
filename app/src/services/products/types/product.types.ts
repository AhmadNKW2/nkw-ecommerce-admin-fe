/**
 * Product Types and Interfaces
 */

import { z } from "zod";
import type {
  ProductSpecificationValue as ProductSpecificationValueEntity,
} from "../../specifications/types/specification.types";

export type ProductStatus = "active" | "archived" | "updated" | "review";

// Category Schema (matches backend)
export const categorySchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  name_en: z.string().optional(),
  name_ar: z.string().optional(),
  description: z.string().optional().nullable(),
  description_en: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  level: z.number().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["active", "archived"]).optional(),
  visible: z.boolean().optional(),
  sortOrder: z.number().optional(),
  parentId: z.number().optional().nullable(),
  parent_id: z.number().optional().nullable(),
  archived_at: z.string().or(z.date()).optional().nullable(),
  archived_by: z.number().optional().nullable(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export type Category = z.infer<typeof categorySchema>;

// Vendor Schema (matches backend)
export const vendorSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  name_en: z.string().optional(),
  name_ar: z.string().optional(),
  description: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  status: z.enum(["active", "archived"]).optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});

export type Vendor = z.infer<typeof vendorSchema>;

// Attribute Schema (matches backend)
export const attributeValueSchema = z.object({
  id: z.number(),
  attribute_id: z.number(),
  value_en: z.string(),
  value_ar: z.string(),
  is_active: z.boolean(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const attributeSchema = z.object({
  id: z.number(),
  name_en: z.string(),
  name_ar: z.string(),
  is_active: z.boolean(),
  values: z.array(attributeValueSchema).optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export type AttributeValue = z.infer<typeof attributeValueSchema>;
export type Attribute = z.infer<typeof attributeSchema>;

// Primary Image Schema
export const primaryImageSchema = z.object({
  id: z.number(),
  url: z.string(),
  type: z.string(),
  alt_text: z.string().optional().nullable(),
});

export type PrimaryImage = z.infer<typeof primaryImageSchema>;

// Stock Summary Schema
export const stockSummarySchema = z.object({
  total_quantity: z.number(),
  in_stock: z.boolean(),
});

export type StockSummary = z.infer<typeof stockSummarySchema>;

// User Schema
export const userSchema = z.object({
  id: z.number(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
});

export type User = z.infer<typeof userSchema>;

export const linkedProductSummarySchema = z.object({
  id: z.number(),
  name_en: z.string().optional().nullable(),
  name_ar: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
});

export type LinkedProductSummary = z.infer<typeof linkedProductSummarySchema>;
export type ProductNameSummary = Pick<LinkedProductSummary, "id" | "name_en" | "name_ar">;

// Product Schema for validation (matches backend)
export const productSchema = z.object({
  id: z.number(),
  name_en: z.string().min(1, "Product name is required"),
  name_ar: z.string().min(1, "Arabic name is required"),
  short_description_en: z.string().optional().nullable(),
  short_description_ar: z.string().optional().nullable(),
  long_description_en: z.string().optional().nullable(),
  long_description_ar: z.string().optional().nullable(),
  category_id: z.number().optional().nullable(), // Primary category (nullable now)
  category_ids: z.array(z.number()).optional(), // Multiple categories
  category: categorySchema.optional().nullable(),
  categories: z.array(categorySchema).optional(), // Multiple category objects
  vendor_id: z.number().optional().nullable(),
  vendor: vendorSchema.optional().nullable(),
  brand_id: z.number().optional().nullable(),
  brand: z.any().optional().nullable(),
  slug: z.string().optional().nullable(),
  reference_link: z.string().optional().nullable(),
  record: z.string().optional().nullable(),
  sku: z.string(),
  is_active: z.boolean().optional(),
  average_rating: z.union([z.number(), z.string()]).optional().nullable(),
  total_ratings: z.number().optional().nullable(),
  image: z.string().optional().nullable(), // Direct image URL
  primary_image: primaryImageSchema.optional().nullable(),
  cost: z.union([z.number(), z.string()]).optional().nullable(),
  price: z.union([z.string(), z.array(z.any()), z.any()]).optional().nullable(),
  sale_price: z.string().optional().nullable(),
  weight: z.union([z.number(), z.string()]).optional().nullable(),
  length: z.union([z.number(), z.string()]).optional().nullable(),
  width: z.union([z.number(), z.string()]).optional().nullable(),
  height: z.union([z.number(), z.string()]).optional().nullable(),
  stock: stockSummarySchema.optional().nullable(),
  quantity: z.number().optional().nullable(),
  low_stock_threshold: z.number().optional().nullable(),
  is_out_of_stock: z.boolean().optional().nullable(),
  meta_title_en: z.string().optional().nullable(),
  meta_title_ar: z.string().optional().nullable(),
  meta_description_en: z.string().optional().nullable(),
  meta_description_ar: z.string().optional().nullable(),
  tags: z.array(z.any()).optional().nullable(),
  variants: z.array(z.any()).optional().nullable(),
  media: z.array(z.any()).optional().nullable(),
  specifications: z.union([z.array(z.any()), z.record(z.string(), z.any())]).optional(),
  linked_group_id: z.number().optional().nullable(),
  linked_product_ids: z.array(z.number()).optional(),
  linked_products: z.array(linkedProductSummarySchema).optional(),
  status: z.enum(["active", "archived", "updated", "review"]).optional(),
  visible: z.boolean().optional(),
  archived_at: z.string().or(z.date()).optional().nullable(),
  archived_by: z.number().optional().nullable(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
  created_by: userSchema.optional().nullable(),

  
  // New API Structure Support
  media_groups: z.record(z.string(), z.any()).optional(),
  price_groups: z.record(z.string(), z.any()).optional(),
  weight_groups: z.record(z.string(), z.any()).optional(),
  attributes: z.record(z.string(), z.any()).optional(),
});

// Helper interfaces for new API structure
export interface ProductMediaItem {
  id: number;
  url: string;
  type: string;
  alt_text: string | null;
  is_primary: boolean;
  is_group_primary: boolean;
}

export interface ProductMediaGroup {
  media: ProductMediaItem[];
}

export interface ProductPriceGroup {
  price: string;
  sale_price: string | null;
}

export interface ProductWeightGroup {
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  }
}

export interface ProductAttributeValue {
  name_en: string;
  name_ar: string;
  color_code: string | null;
}

export interface ProductAttribute {
  name_en: string;
  name_ar: string;
  values: Record<string, ProductAttributeValue>;
}

export interface ProductSpecificationValueItem {
  name_en: string;
  name_ar: string;
}

export interface ProductSpecification {
  name_en: string;
  name_ar: string;
  unit_en?: string | null;
  unit_ar?: string | null;
  list_separately?: boolean;
  values: Record<string, ProductSpecificationValueItem>;
}

export interface ProductVariant {
  id: number;
  is_active: boolean;
  quantity: number;
  attribute_values: Record<string, number>;
  price_group_id: string;
  media_group_id: string;
  weight_group_id: string;
}

// TypeScript type inferred from schema with extensions for strict types
export type Product = z.infer<typeof productSchema> & {
  media_groups?: Record<string, ProductMediaGroup>;
  price_groups?: Record<string, ProductPriceGroup>;
  weight_groups?: Record<string, ProductWeightGroup>;
  attributes?: Record<string, ProductAttribute>;
  specifications?: Record<string, ProductSpecification> | ProductSpecificationValueEntity[];
  variants?: ProductVariant[];
};

// Extended Product with relations (for detail view)
export interface ProductMedia {
  id: number;
  product_id: number;
  url: string;
  type: 'image' | 'video';
  sort_order: number;
  is_primary: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ProductPricing {
  id: number;
  product_id: number;
  cost: string;
  price: string;
  sale_price?: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ProductWeight {
  id: number;
  product_id: number;
  weight?: string | null;
  length?: string | null;
  width?: string | null;
  height?: string | null;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ProductStock {
  id: number;
  product_id: number;
  variant_id?: number;
  stock_quantity?: number;
  quantity?: number;
  is_out_of_stock?: boolean;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ProductDetail extends Omit<Product, 'vendor' | 'category' | 'stock' | 'attributes' | 'weight'> {
  category?: Category | null;
  vendor?: {
    id: number;
    name: string;
    description?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    logo?: string | null;
    is_active?: boolean;
    isActive?: boolean;
    created_at?: string | Date;
    updated_at?: string | Date;
    createdAt?: string | Date;
    updatedAt?: string | Date;
  } | null;
  brand?: {
    id: number;
    name_en: string;
    name_ar: string;
    description_en?: string | null;
    description_ar?: string | null;
    logo?: string | null;
    visible?: boolean;
    is_active?: boolean;
    sort_order?: number;
  } | null;
  created_by?: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  media?: ProductMedia[];
  pricing?: ProductPricing[];
  weight?: ProductWeight[];
  stock?: ProductStock[];
  variants?: any[];
  attributes?: any[];
  // New API structure
  priceGroups?: any[];
  weightGroups?: any[];
  mediaGroups?: any[];
}

// Product Filter (matches backend FilterProductDto)
export interface ProductFilters {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  category_ids?: string;
  vendor_id?: string | number;
  vendor_ids?: string;
  brand_ids?: string;
  created_by?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  is_active?: boolean;
  is_featured?: boolean;
  start_date?: string;
  end_date?: string;
  visible?: boolean | string;
  in_stock?: boolean | string;
}

export interface ProductNamesFilters {
  category_ids?: string;
  vendor_id?: string | number;
  search?: string;
}

export interface BulkReviewReimportAiDto {
  category_id: number;
  vendor_id: number;
}

export interface ProductImportJobStart {
  job_id: string;
  status?: string;
}

export interface ProductImportJobResultItem {
  product_id?: number;
  name_en?: string;
  status?: string;
  error?: string;
}

export interface ProductImportJobStatus {
  job_id?: string;
  status: string;
  message?: string;
  result?: {
    message?: string;
    matched?: number;
    reimported?: number;
    failed?: number;
    filters?: {
      status?: ProductStatus;
      category_id?: number;
      vendor_id?: number;
    };
    results?: ProductImportJobResultItem[];
  } | null;
  error?: string | { message?: string } | null;
}

// ==================== DTOs ====================

//  Product Creation DTOs
export interface ProductAttributeInput {
  attribute_id: number;
  attribute_value_ids?: number[]; // Exactly one value id is expected.
}

export interface SinglePricingInput {
  cost?: number;
  price: number;
  sale_price?: number;
}

export interface VariantPricingInput {
  combination: Record<string, number>; // { "Color": 1, "Size": 3 }
  cost?: number;
  price: number;
  sale_price?: number;
}

export interface MediaInput {
  media_url: string;
  media_type: 'image' | 'video';
  sort_order?: number;
  is_primary?: boolean;
}

export interface VariantMediaInput {
  combination: Record<string, number>;
  media_url: string;
  media_type: 'image' | 'video';
  sort_order?: number;
  is_primary?: boolean;
}

export interface WeightInput {
  weight: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface VariantWeightInput {
  combination: Record<string, number>;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface StockInput {
  combination: Record<string, number>;
  stock_quantity: number;
}

// Price Group Input (for variant products)
export interface PriceGroupInput {
  combination: Record<string, number>; // { "attr_id": value_id }
  cost?: number;
  price: number;
  sale_price?: number | null;
}

// Weight Group Input (for variant products)
export interface WeightGroupInput {
  combination: Record<string, number>; // { "attr_id": value_id }
  weight: number;
  length?: number;
  width?: number;
  height?: number;
}

// Variant Input (for variant products - stock per variant)
export interface VariantInput {
  attribute_value_ids?: number[];
  combination?: Record<string, number>;
  is_active?: boolean;
  sku_suffix?: string;
  stock_quantity?: number;
}

// ==================== CREATE/UPDATE SHARED TYPES ====================

// Price item with optional combination
export interface PriceInput {
  combination?: Record<string, number>; // { "attr_id": value_id } - optional for simple products
  cost?: number;
  price: number;
  sale_price?: number;
}

// Weight item with optional combination
export interface WeightInputWithCombination {
  combination?: Record<string, number>; // { "attr_id": value_id } - optional for simple products
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

// Stock item with optional combination
export interface StockInputWithCombination {
  combination?: Record<string, number>; // { "attr_id": value_id } - optional for simple products
  quantity?: number;
  is_out_of_stock: boolean;
}

// New Media Input format (references uploaded media by ID)
export interface MediaInputDto {
  media_id: number;        // ID from /api/media/upload
  is_primary?: boolean;    // Default: false
  sort_order?: number;     // Default: 0
}

export interface ProductSpecificationInputDto {
  specification_id: number;
  specification_value_ids: number[];
}

// ==================== CREATE PRODUCT DTO ====================
export interface CreateProductDto {
  // Basic product info
  name_en: string;
  name_ar: string;
  sku?: string;
  record?: string | null;
  status?: ProductStatus;
  short_description_en: string;
  short_description_ar: string;
  long_description_en: string;
  long_description_ar: string;
  category_ids: number[]; // Changed from category_id to category_ids array
  vendor_id?: number;
  brand_id?: number;
  reference_link?: string | null;
  cost?: number;
  price?: number;
  sale_price?: number | null;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  quantity?: number;
  low_stock_threshold?: number;
  is_out_of_stock?: boolean;
  meta_title_en?: string;
  meta_title_ar?: string;
  meta_description_en?: string;
  meta_description_ar?: string;
  tags?: string[];
  linked_product_ids: number[];
  specifications?: ProductSpecificationInputDto[];
  visible?: boolean;

  // Attributes
  attributes?: ProductAttributeInput[];
  media?: MediaInputDto[];
}

// ==================== UPDATE PRODUCT DTOs ====================

// Media Management
export interface UpdateMediaDto {
  media_id: number;
  sort_order?: number;
  is_primary?: boolean;
  is_group_primary?: boolean;
}

export interface DeleteMediaDto {
  media_id: number;
  is_variant?: boolean;
}

export interface ReorderMediaDto {
  media_id: number;
  sort_order: number;
  is_primary?: boolean;
  is_group_primary?: boolean;
}

export interface MediaManagementDto {
  update_media?: UpdateMediaDto[];
  delete_media?: DeleteMediaDto[];
  reorder_media?: ReorderMediaDto[];
  set_primary_media_id?: number;
  is_variant_media?: boolean;
}

// Attributes Management
export interface UpdateProductAttributeInputDto {
  attribute_id: number;
}

export interface AddProductAttributeInputDto {
  attribute_id: number;
}

// Pricing Management
export interface UpdateSinglePricingDto {
  cost?: number;
  price?: number;
  sale_price?: number;
}

export interface UpdateVariantPricingDto {
  combination: Record<string, number>;
  cost?: number;
  price?: number;
  sale_price?: number;
}

// Weight Management
export interface UpdateWeightDto {
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface UpdateVariantWeightDto {
  combination: Record<string, number>;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

// Stock Management
export interface UpdateStockInputDto {
  combination: Record<string, number>;
  stock_quantity: number;
}

// Main Update DTO
export interface UpdateProductDto {
  // Basic Information
  name_en?: string;
  name_ar?: string;
  sku?: string;
  record?: string | null;
  status?: ProductStatus;
  short_description_en?: string;
  short_description_ar?: string;
  long_description_en?: string;
  long_description_ar?: string;
  category_ids?: number[]; // Changed from category_id to category_ids array
  vendor_id?: number;
  brand_id?: number;
  reference_link?: string | null;
  cost?: number;
  price?: number;
  sale_price?: number | null;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  quantity?: number;
  low_stock_threshold?: number;
  is_out_of_stock?: boolean;
  meta_title_en?: string;
  meta_title_ar?: string;
  meta_description_en?: string;
  meta_description_ar?: string;
  tags?: string[];
  linked_product_ids: number[];
  specifications?: ProductSpecificationInputDto[];
  visible?: boolean;

  // Attributes
  attributes?: ProductAttributeInput[];
  media?: MediaInputDto[];
}

// Restore Product DTO
export interface RestoreProductDto {
  newCategoryId?: number | null;
}
