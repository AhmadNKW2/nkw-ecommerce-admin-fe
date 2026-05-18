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
  created_at?: string;
  updated_at?: string;
}

export type UpdateSeoSettingsDto = Partial<
  Omit<SeoSettings, 'id' | 'created_at' | 'updated_at'>
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