export interface SeoSettings {
  id: number;
  site_name_en: string;
  site_name_ar: string;
  default_meta_title_en: string;
  default_meta_title_ar: string;
  default_meta_description_en: string;
  default_meta_description_ar: string;
  default_og_image: string | null;
  twitter_handle: string | null;
  google_verification: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  show_sale_pricing: boolean;
  free_delivery_enabled: boolean;
  free_delivery_amount: number;
  delivery_fee: number;
  created_at?: string;
  updated_at?: string;
}

export type UpdateSeoSettingsDto = Partial<
  Omit<SeoSettings, 'id' | 'created_at' | 'updated_at'>
>;

export interface ProductFieldToggles {
  id: number;
  // Disabling toggles — enforced by BE on create/update, hide UI on both frontends.
  vendors_enabled: boolean;
  attributes_enabled: boolean;
  specifications_enabled: boolean;
  weight_and_dimensions_enabled: boolean;
  // Appearance-only toggles — admin dashboard UI only; BE ignores them.
  reference_link_visible_admin: boolean;
  meta_title_visible_admin: boolean;
  meta_description_visible_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

export type UpdateProductFieldTogglesDto = Partial<
  Omit<ProductFieldToggles, 'id' | 'created_at' | 'updated_at'>
>;

export interface ProductPriceRule {
  id: number;
  min_vendor_price: number;
  max_vendor_price: number | null;
  percentage: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductPriceRuleDto {
  min_vendor_price: number;
  max_vendor_price?: number | null;
  percentage: number;
  is_active?: boolean;
}

export type UpdateProductPriceRuleDto = Partial<CreateProductPriceRuleDto>;

export interface RepriceExistingProductsResult {
  updated_count: number;
  percentage: number;
  message: string;
}

export interface BulkUpdateProductPricingDto {
  action: 'increase' | 'decrease' | 'reset';
  percentage?: number;
  vendor_ids?: number[];
}

export interface BulkUpdateProductPricingResult {
  action: 'increase' | 'decrease' | 'reset';
  percentage: number | null;
  vendor_ids: number[];
  updated_count: number;
  message: string;
}

export interface ImportedPricingAuditFilters {
  page?: number;
  limit?: number;
  mismatch_only?: boolean;
  product_ids?: string;
}

export interface ImportedPricingSnapshot {
  original_vendor_price: number | null;
  original_vendor_sale_price: number | null;
  price: number | null;
  sale_price: number | null;
}

export interface ImportedPricingAuditItem {
  product_id: number;
  name_en: string | null;
  status: string | null;
  input_shape: string;
  input_pricing: {
    new_price: unknown;
    old_price: unknown;
    price: unknown;
    sale_price: unknown;
  };
  current: ImportedPricingSnapshot;
  expected: ImportedPricingSnapshot | null;
  mismatch_fields: string[];
  is_mismatch: boolean;
  error: string | null;
}

export interface ImportedPricingAuditResult {
  data: ImportedPricingAuditItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_scanned: number;
    total_mismatches: number;
  };
}

export interface SyncImportedPricingDto {
  product_ids: number[];
  dry_run?: boolean;
}

export interface SyncImportedPricingResultItem {
  product_id: number;
  status: string;
  reason?: string;
  error?: string;
  mismatch_fields?: string[];
}

export interface SyncImportedPricingResult {
  dry_run: boolean;
  requested_product_ids: number[];
  missing_product_ids: number[];
  total_requested: number;
  total_found: number;
  total_mismatches?: number;
  updated?: number;
  failed?: number;
  skipped?: number;
  results: Array<SyncImportedPricingResultItem | ImportedPricingAuditItem>;
}