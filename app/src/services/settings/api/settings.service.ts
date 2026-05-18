import { httpClient } from '../../../lib/api/http-client';
import { ApiResponse } from '../../../types/common.types';
import {
  CreateProductPriceRuleDto,
  ProductPriceRule,
  RepriceExistingProductsResult,
  SeoSettings,
  UpdateProductPriceRuleDto,
  UpdateSeoSettingsDto,
} from '../types/settings.types';

class SettingsService {
  private seoEndpoint = '/settings/seo';
  private pricingRulesEndpoint = '/settings/pricing-rules';

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
}

export const settingsService = new SettingsService();