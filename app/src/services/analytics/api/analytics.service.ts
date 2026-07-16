import { httpClient } from "../../../lib/api/http-client";
import type { ApiResponse, PaginatedApiResponse } from "../../../types/common.types";
import type {
  AnalyticsDateCoverage,
  AnalyticsDateCoverageScope,
  AnalyticsOverview,
  AnalyticsOverviewParams,
  AnalyticsPopularProduct,
  AnalyticsPopularProductsMeta,
  AnalyticsPopularProductsParams,
  AnalyticsSearchQueriesMeta,
  AnalyticsSearchQueriesParams,
  AnalyticsSearchQuery,
  AnalyticsVisitorDetail,
  AnalyticsVisitorListItem,
  AnalyticsVisitorsParams,
} from "../types/analytics.types";

class AnalyticsService {
  private endpoint = "/analytics";

  async getOverview(
    params?: AnalyticsOverviewParams,
  ): Promise<ApiResponse<AnalyticsOverview>> {
    return httpClient.get<ApiResponse<AnalyticsOverview>>(
      `${this.endpoint}/overview`,
      params,
    );
  }

  async listVisitors(params?: AnalyticsVisitorsParams) {
    return httpClient.get<PaginatedApiResponse<AnalyticsVisitorListItem>>(
      `${this.endpoint}/visitors`,
      params,
    );
  }

  async listPopularProducts(params?: AnalyticsPopularProductsParams) {
    return httpClient.get<
      PaginatedApiResponse<AnalyticsPopularProduct, AnalyticsPopularProductsMeta>
    >(`${this.endpoint}/popular-products`, params);
  }

  async listSearchQueries(params?: AnalyticsSearchQueriesParams) {
    return httpClient.get<
      PaginatedApiResponse<AnalyticsSearchQuery, AnalyticsSearchQueriesMeta>
    >(`${this.endpoint}/search-queries`, params);
  }

  async getDateCoverage(scope: AnalyticsDateCoverageScope) {
    return httpClient.get<{ success: boolean; data: AnalyticsDateCoverage }>(
      `${this.endpoint}/date-coverage`,
      { scope },
    );
  }

  async getVisitor(id: number): Promise<ApiResponse<AnalyticsVisitorDetail>> {
    return httpClient.get<ApiResponse<AnalyticsVisitorDetail>>(
      `${this.endpoint}/visitors/${id}`,
    );
  }

  async deleteVisitor(
    id: number,
  ): Promise<ApiResponse<{ success: boolean; id: number; browserKey?: string }>> {
    return httpClient.delete<
      ApiResponse<{ success: boolean; id: number; browserKey?: string }>
    >(`${this.endpoint}/visitors/${id}`);
  }

  async registerAdminClient(payload: {
    browserKey: string;
    source?: string;
    userAgent?: string;
    deviceModel?: string;
  }): Promise<
    ApiResponse<{
      id: number;
      browserKey: string;
      reused?: boolean;
      purgedVisitors: number;
      deviceType?: string | null;
      deviceModel?: string | null;
    }>
  > {
    return httpClient.post<
      ApiResponse<{
        id: number;
        browserKey: string;
        reused?: boolean;
        purgedVisitors: number;
        deviceType?: string | null;
        deviceModel?: string | null;
      }>
    >(`${this.endpoint}/admin-clients/register`, payload, {
      headers: { "x-skip-request-toast": "1" },
    });
  }

  async renameAdminClientDevice(
    deviceId: number,
    deviceName: string,
  ): Promise<
    ApiResponse<{
      id: number;
      browserKey: string;
      deviceName: string;
      deviceType: string | null;
      source: string;
    }>
  > {
    return httpClient.patch<
      ApiResponse<{
        id: number;
        browserKey: string;
        deviceName: string;
        deviceType: string | null;
        source: string;
      }>
    >(`${this.endpoint}/admin-clients/${deviceId}`, {
      deviceName,
    });
  }
}

export const analyticsService = new AnalyticsService();
