import { httpClient } from '../../../lib/api/http-client';
import { ApiResponse } from '../../../types/common.types';
import { PaginatedApiResponse } from '../../../types/common.types';
import {
  CreateProductPriceRuleDto,
  ImportedPricingAuditFilters,
  ImportedPricingAuditResult,
  FeatureToggles,
  GenerateSeoDto,
  GenerateSeoStartResult,
  ListMissingSeoFilters,
  ProductFieldToggles,
  ProductPriceRule,
  ProductPriceRuleMutationResult,
  ProductPricingJobStartResult,
  ProductPricingJobStatus,
  DeleteProductPriceRuleResult,
  RepriceExistingProductsResult,
  SeoGenerateJobStatus,
  SeoMissingItem,
  SeoMissingListMeta,
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
  ): Promise<ApiResponse<ProductPriceRuleMutationResult>> {
    return httpClient.post<ApiResponse<ProductPriceRuleMutationResult>>(
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
  ): Promise<ApiResponse<ProductPriceRuleMutationResult>> {
    return httpClient.patch<ApiResponse<ProductPriceRuleMutationResult>>(
      `${this.pricingRulesEndpoint}/${id}`,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async deleteProductPriceRule(
    id: number,
  ): Promise<ApiResponse<DeleteProductPriceRuleResult>> {
    return httpClient.delete<ApiResponse<DeleteProductPriceRuleResult>>(
      `${this.pricingRulesEndpoint}/${id}`,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async verifyAndFixProductPricing(): Promise<
    ApiResponse<ProductPricingJobStartResult>
  > {
    return httpClient.post<ApiResponse<ProductPricingJobStartResult>>(
      `${this.pricingRulesEndpoint}/verify`,
      undefined,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async getProductPricingJob(
    jobId: string,
  ): Promise<ApiResponse<ProductPricingJobStatus>> {
    return httpClient.get<ApiResponse<ProductPricingJobStatus>>(
      `${this.pricingRulesEndpoint}/jobs/${jobId}`,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async cancelProductPricingJob(
    jobId: string,
  ): Promise<ApiResponse<{ job_id: string; status: string; message: string }>> {
    return httpClient.post<
      ApiResponse<{ job_id: string; status: string; message: string }>
    >(`${this.pricingRulesEndpoint}/jobs/${jobId}/cancel`, undefined, {
      headers: { 'x-skip-request-toast': '1' },
    });
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

  async listMissingSeo(
    params?: ListMissingSeoFilters,
  ): Promise<PaginatedApiResponse<SeoMissingItem, SeoMissingListMeta>> {
    return httpClient.get<PaginatedApiResponse<SeoMissingItem, SeoMissingListMeta>>(
      `${this.seoEndpoint}/missing`,
      params,
    );
  }

  async generateSeo(
    data: GenerateSeoDto,
  ): Promise<ApiResponse<GenerateSeoStartResult>> {
    return httpClient.post<ApiResponse<GenerateSeoStartResult>>(
      `${this.seoEndpoint}/generate`,
      data,
      {
        headers: { 'x-skip-request-toast': '1' },
      },
    );
  }

  async getSeoGenerateJobStatus(
    jobId: string,
  ): Promise<ApiResponse<SeoGenerateJobStatus>> {
    return httpClient.get<ApiResponse<SeoGenerateJobStatus>>(
      `${this.seoEndpoint}/jobs/${jobId}`,
    );
  }
}

export const settingsService = new SettingsService();