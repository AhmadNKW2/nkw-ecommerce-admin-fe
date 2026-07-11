export interface SeoSettings {
  id: number;
  site_name_en: string;
  site_name_ar: string;
  site_logo: string | null;
  brand_primary: string | null;
  brand_primary_2: string | null;
  brand_primary_3: string | null;
  brand_secondary: string | null;
  brand_success: string | null;
  brand_success_2: string | null;
  brand_danger: string | null;
  brand_danger_2: string | null;
  default_meta_title_en: string;
  default_meta_title_ar: string;
  default_meta_description_en: string;
  default_meta_description_ar: string;
  default_og_image: string | null;
  twitter_handle: string | null;
  support_email: string;
  facebook_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  google_verification: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  show_sale_pricing: boolean;
  free_delivery_enabled: boolean;
  free_delivery_amount: number;
  delivery_fee: number;
  low_stock_threshold: number;
  created_at?: string;
  updated_at?: string;
}

export type UpdateSeoSettingsDto = Partial<
  Omit<
    SeoSettings,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'free_delivery_amount'
    | 'delivery_fee'
    | 'low_stock_threshold'
  >
> & {
  free_delivery_amount?: number | null;
  delivery_fee?: number | null;
  low_stock_threshold?: number | null;
};

export interface FeatureToggles {
  id: number;
  // Disabling toggles — enforced by BE on create/update, hide UI on admin + storefront.
  vendors_enabled: boolean;
  ratings_enabled: boolean;
  attributes_enabled: boolean;
  specifications_enabled: boolean;
  weight_and_dimensions_enabled: boolean;
  partners_enabled: boolean;
  cashback_enabled: boolean;
  banners_enabled: boolean;
  import_ai_products_enabled: boolean;
  linked_products_enabled: boolean;
  reference_links_enabled: boolean;
  product_status_enabled: boolean;
  product_files_enabled: boolean;
  pricing_view_enabled: boolean;
  easy_purchase_enabled: boolean;
  cart_sidebar_button_enabled: boolean;
  popup_enabled: boolean;
  // Appearance-only toggles — admin dashboard UI only; BE ignores them.
  reference_link_visible_admin: boolean;
  meta_title_visible_admin: boolean;
  meta_description_visible_admin: boolean;
  created_at?: string;
  updated_at?: string;
}

/** @deprecated Use FeatureToggles */
export type ProductFieldToggles = FeatureToggles;

export type UpdateFeatureTogglesDto = Partial<
  Omit<FeatureToggles, 'id' | 'created_at' | 'updated_at'>
>;

export interface SitePopupSettings {
  id: number;
  enabled: boolean;
  image_url: string | null;
  link_url: string | null;
  dismiss_after_seconds: number;
  created_at?: string;
  updated_at?: string;
}

export type UpdateSitePopupSettingsDto = Partial<
  Omit<SitePopupSettings, 'id' | 'created_at' | 'updated_at'>
>;

/** @deprecated Use UpdateFeatureTogglesDto */
export type UpdateProductFieldTogglesDto = UpdateFeatureTogglesDto;

export interface ProductPriceRule {
  id: number;
  vendor_id: number | null;
  brand_id: number | null;
  category_ids: number[] | null;
  price_condition: 'any' | 'more_than' | 'less_than' | 'between';
  adjustment_type: 'increase' | 'decrease';
  min_vendor_price: number;
  max_vendor_price: number | null;
  percentage: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductPriceRuleDto {
  vendor_id?: number | null;
  brand_id?: number | null;
  category_ids?: number[] | null;
  price_condition?: 'any' | 'more_than' | 'less_than' | 'between';
  adjustment_type?: 'increase' | 'decrease';
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