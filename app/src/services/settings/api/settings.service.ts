import { httpClient } from '../../../lib/api/http-client';
import { ApiResponse } from '../../../types/common.types';
import {
  BulkUpdateProductPricingDto,
  BulkUpdateProductPricingResult,
  CreateProductPriceRuleDto,
  ImportedPricingAuditFilters,
  ImportedPricingAuditResult,
  FeatureToggles,
  ProductFieldToggles,
  ProductPriceRule,
  RepriceExistingProductsResult,
  SeoSettings,
  SyncImportedPricingDto,
  SyncImportedPricingResult,
  UpdateFeatureTogglesDto,
  UpdateProductFieldTogglesDto,
  UpdateProductPriceRuleDto,
  UpdateSeoSettingsDto,
  UpdateSitePopupSettingsDto,
  SitePopupSettings,
} from '../types/settings.types';

class SettingsService {
  private seoEndpoint = '/settings/seo';
  private pricingRulesEndpoint = '/settings/pricing-rules';
  private featuresEndpoint = '/settings/features';
  private popupEndpoint = '/settings/popup';
  private pricingAuditEndpoint = '/products/import-pricing/audit';
  private pricingSyncEndpoint = '/products/import-pricing/sync';

  async getSeoSettings(): Promise<ApiResponse<SeoSettings>> {
    return httpClient.get<ApiResponse<SeoSettings>>(this.seoEndpoint);
  }

  async updateSeoSettings(
    data: UpdateSeoSettingsDto,
  ): Promise<ApiResponse<SeoSettings>> {
    return httpClient.patch<ApiResponse<SeoSettings>>(this.seoEndpoint, data, {
      headers: { 'x-skip-request-toast': '1' },
    });
  }

  async getFeatureToggles(): Promise<ApiResponse<FeatureToggles>> {
    return httpClient.get<ApiResponse<FeatureToggles>>(this.featuresEndpoint);
  }

  async updateFeatureToggles(
    data: UpdateFeatureTogglesDto,
  ): Promise<ApiResponse<FeatureToggles>> {
    return httpClient.patch<ApiResponse<FeatureToggles>>(
      this.featuresEndpoint,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async getSitePopupSettings(): Promise<ApiResponse<SitePopupSettings>> {
    return httpClient.get<ApiResponse<SitePopupSettings>>(this.popupEndpoint);
  }

  async updateSitePopupSettings(
    data: UpdateSitePopupSettingsDto,
  ): Promise<ApiResponse<SitePopupSettings>> {
    return httpClient.patch<ApiResponse<SitePopupSettings>>(this.popupEndpoint, data, {
      headers: { 'x-skip-request-toast': '1' },
    });
  }

  /** @deprecated Use getFeatureToggles */
  async getProductFieldToggles(): Promise<ApiResponse<ProductFieldToggles>> {
    return this.getFeatureToggles();
  }

  /** @deprecated Use updateFeatureToggles */
  async updateProductFieldToggles(
    data: UpdateProductFieldTogglesDto,
  ): Promise<ApiResponse<ProductFieldToggles>> {
    return this.updateFeatureToggles(data);
  }

  async getProductPriceRules(): Promise<ApiResponse<ProductPriceRule[]>> {
    return httpClient.get<ApiResponse<ProductPriceRule[]>>(
      this.pricingRulesEndpoint,
    );
  }

  async createProductPriceRule(
    data: CreateProductPriceRuleDto,
  ): Promise<ApiResponse<ProductPriceRule>> {
    return httpClient.post<ApiResponse<ProductPriceRule>>(
      this.pricingRulesEndpoint,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async updateProductPriceRule(
    id: number,
    data: UpdateProductPriceRuleDto,
  ): Promise<ApiResponse<ProductPriceRule>> {
    return httpClient.patch<ApiResponse<ProductPriceRule>>(
      `${this.pricingRulesEndpoint}/${id}`,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async deleteProductPriceRule(
    id: number,
  ): Promise<ApiResponse<{ message: string }>> {
    return httpClient.delete<ApiResponse<{ message: string }>>(
      `${this.pricingRulesEndpoint}/${id}`,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async repriceExistingProducts(): Promise<ApiResponse<RepriceExistingProductsResult>> {
    return httpClient.post<ApiResponse<RepriceExistingProductsResult>>(
      `${this.pricingRulesEndpoint}/reprice-existing`,
      undefined,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async bulkUpdateProductPricing(
    data: BulkUpdateProductPricingDto,
  ): Promise<ApiResponse<BulkUpdateProductPricingResult>> {
    return httpClient.post<ApiResponse<BulkUpdateProductPricingResult>>(
      `${this.pricingRulesEndpoint}/bulk-update`,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async getImportedPricingAudit(
    params?: ImportedPricingAuditFilters,
  ): Promise<ApiResponse<ImportedPricingAuditResult>> {
    return httpClient.get<ApiResponse<ImportedPricingAuditResult>>(
      this.pricingAuditEndpoint,
      params,
    );
  }

  async syncImportedPricing(
    data: SyncImportedPricingDto,
  ): Promise<ApiResponse<SyncImportedPricingResult>> {
    return httpClient.post<ApiResponse<SyncImportedPricingResult>>(
      this.pricingSyncEndpoint,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }
}

export const settingsService = new SettingsService();