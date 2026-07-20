export type ShippingCutoffMode = "before" | "after" | "any";
export type ShippingArrivalMode = "offset_days" | "next_weekday";

/** Weekday: 0 = Sunday … 6 = Saturday. */
export type ShippingDeliveryRule = {
  id: string;
  days: number[];
  cutoffMode: ShippingCutoffMode;
  arrivalMode: ShippingArrivalMode;
  arrivalOffsetDays?: number;
  arrivalWeekday?: number;
};

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
  shipping_rules_enabled: boolean;
  shipping_cutoff_hour: number;
  shipping_rules: ShippingDeliveryRule[];
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
    | 'shipping_cutoff_hour'
  >
> & {
  free_delivery_amount?: number | null;
  delivery_fee?: number | null;
  low_stock_threshold?: number | null;
  shipping_cutoff_hour?: number | null;
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
  vendor_ids: number[] | null;
  brand_ids: number[] | null;
  category_ids: number[] | null;
  /** Null/any means any product price (no price filter). */
  price_condition: 'any' | 'more_than' | 'less_than' | 'between' | null;
  adjustment_type: 'increase' | 'decrease';
  min_product_price: number | null;
  max_product_price: number | null;
  percentage: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductPriceRuleDto {
  vendor_ids?: number[] | null;
  brand_ids?: number[] | null;
  category_ids?: number[] | null;
  /** Null means any product price (no price filter). */
  price_condition?: 'any' | 'more_than' | 'less_than' | 'between' | null;
  adjustment_type?: 'increase' | 'decrease';
  min_product_price?: number | null;
  max_product_price?: number | null;
  percentage: number;
  is_active?: boolean;
}

export type UpdateProductPriceRuleDto = Partial<CreateProductPriceRuleDto>;

export interface RepriceExistingProductsResult {
  updated_count: number;
  percentage: number;
  message: string;
}

export interface ProductPriceRuleMutationResult extends ProductPriceRule {
  reprice_job_id: string;
}

export interface ProductPricingJobStartResult {
  job_id: string;
  status: 'running';
  mode: 'reprice' | 'verify_and_fix';
  started_at: string;
}

export interface ProductPricingJobStatus {
  job_id: string;
  status: 'running' | 'done' | 'failed' | 'cancelled';
  mode: 'reprice' | 'verify_and_fix';
  started_at: string;
  finished_at: string | null;
  progress: number;
  total: number;
  remaining: number;
  changed_count: number;
  unchanged_count: number;
  skipped_count: number;
  mismatched_count: number;
  current_product_id: number | null;
  error: string | null;
  duration_seconds: number;
  message: string;
}

export interface DeleteProductPriceRuleResult {
  message: string;
  reprice_job_id: string;
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

export type SeoEntityType = "product" | "category" | "brand" | "vendor";

export type SeoListStatus = "missing" | "all" | "complete";

export type SeoMissingField =
  | "meta_title_en"
  | "meta_title_ar"
  | "meta_description_en"
  | "meta_description_ar";

export interface SeoMissingCounts {
  product: number;
  category: number;
  brand: number;
  vendor: number;
}

export interface SeoMissingItem {
  id: number;
  type: SeoEntityType;
  slug: string | null;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  meta_title_en: string | null;
  meta_title_ar: string | null;
  meta_description_en: string | null;
  meta_description_ar: string | null;
  missing_fields: SeoMissingField[];
  product_count?: number;
  brand_name?: string | null;
  sku?: string | null;
}

export interface ListMissingSeoFilters {
  type?: SeoEntityType;
  seo_status?: SeoListStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface SeoMissingListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: SeoMissingCounts;
  seo_status?: SeoListStatus;
}

export interface GenerateSeoDto {
  type: SeoEntityType;
  ids: number[] | "all_missing";
  search_internet?: boolean;
  overwrite?: boolean;
}

export interface GenerateSeoStartResult {
  job_id: string;
  message: string;
}

export interface SeoGenerateJobStatus {
  job_id: string;
  type: string;
  entity_type?: SeoEntityType;
  status: "running" | "done" | "failed" | "cancelled";
  started_at: string;
  finished_at: string | null;
  progress: number | null;
  total: number | null;
  current_index: number | null;
  current_item: string | null;
  duration_seconds: number;
  result: {
    processed?: number;
    updated?: number;
    skipped?: number;
    failed?: number;
    failures?: Array<{ id: number; name: string; error: string }>;
  } | null;
  error: string | null;
}