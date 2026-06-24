import { httpClient } from '../../../lib/api/http-client';
import { ApiResponse } from '../../../types/common.types';
import {
  BulkUpdateProductPricingDto,
  BulkUpdateProductPricingResult,
  CreateProductPriceRuleDto,
  ImportedPricingAuditFilters,
  ImportedPricingAuditResult,
  ProductFieldToggles,
  ProductPriceRule,
  RepriceExistingProductsResult,
  SeoSettings,
  SyncImportedPricingDto,
  SyncImportedPricingResult,
  UpdateProductFieldTogglesDto,
  UpdateProductPriceRuleDto,
  UpdateSeoSettingsDto,
} from '../types/settings.types';

class SettingsService {
  private seoEndpoint = '/settings/seo';
  private pricingRulesEndpoint = '/settings/pricing-rules';
  private productFieldsEndpoint = '/settings/product-fields';
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

  async getProductFieldToggles(): Promise<ApiResponse<ProductFieldToggles>> {
    return httpClient.get<ApiResponse<ProductFieldToggles>>(
      this.productFieldsEndpoint,
    );
  }

  async updateProductFieldToggles(
    data: UpdateProductFieldTogglesDto,
  ): Promise<ApiResponse<ProductFieldToggles>> {
    return httpClient.patch<ApiResponse<ProductFieldToggles>>(
      this.productFieldsEndpoint,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
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