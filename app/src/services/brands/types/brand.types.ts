/**
 * Brand Types
 * Mirrors vendor structures for parity with archiving and product handling
 */

import { z } from "zod";
import { ProductChangesPayload } from "../../../lib/product-changes";

// Archived Product (included in archived brand response)
export interface ArchivedBrandProduct {
  id: number;
  name_en: string;
  name_ar: string;
  sku?: string;
  image?: string | null;
  archived_at?: string | Date | null;
  archived_by?: number | null;
}

// Brand Schema (matches backend expectation)
export const brandSchema = z.object({
  id: z.number(),
  name_en: z.string(),
  name_ar: z.string(),
  description_en: z.string().optional().nullable(),
  description_ar: z.string().optional().nullable(),
  meta_title_en: z.string().optional().nullable(),
  meta_title_ar: z.string().optional().nullable(),
  meta_description_en: z.string().optional().nullable(),
  meta_description_ar: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  visible: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().optional(),
  status: z.enum(["active", "archived"]).optional(),
  archived_at: z.string().or(z.date()).optional().nullable(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
  archivedProducts: z.array(z.any()).optional(),
});

export type Brand = z.infer<typeof brandSchema> & {
  archivedProducts?: ArchivedBrandProduct[];
};

// Create Brand DTO
export interface CreateBrandDto {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  meta_title_en?: string;
  meta_title_ar?: string;
  meta_description_en?: string;
  meta_description_ar?: string;
  visible?: boolean;
  logo?: File | null;
  product_changes?: ProductChangesPayload;
}

// Update Brand DTO
export interface UpdateBrandDto {
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  meta_title_en?: string;
  meta_title_ar?: string;
  meta_description_en?: string;
  meta_description_ar?: string;
  visible?: boolean;
  logo?: File | null;
  product_changes?: ProductChangesPayload;
}

// Reorder Brands DTO
export interface ReorderBrandsDto {
  brands: { id: number; sort_order: number }[];
}

// Permanent Delete Brand DTO
export interface PermanentDeleteBrandDto {
  deleteProducts?: boolean;
  moveProductsToBrandId?: number;
}

// Restore Brand DTO
export interface RestoreBrandDto {
  restoreAllProducts?: boolean;
  product_ids?: number[];
}

// Brand Query Params
export interface BrandQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  status?: 'active' | 'archived';
  visible?: boolean;
}

// Restore Result
export interface BrandRestoreResult {
  brand: Brand;
  restoredProducts: number;
  skippedProducts: number;
}
