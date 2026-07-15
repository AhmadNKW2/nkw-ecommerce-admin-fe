import { httpClient } from "../../../lib/api/http-client";
import type { ApiResponse, PaginatedApiResponse } from "../../../types/common.types";
import type {
  AnalyticsOverview,
  AnalyticsOverviewParams,
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

  async getVisitor(id: number): Promise<ApiResponse<AnalyticsVisitorDetail>> {
    return httpClient.get<ApiResponse<AnalyticsVisitorDetail>>(
      `${this.endpoint}/visitors/${id}`,
    );
  }

  async registerAdminClient(payload: {
    browserKey: string;
    source?: string;
    userAgent?: string;
  }): Promise<ApiResponse<{ id: number; browserKey: string; purgedVisitors: number }>> {
    return httpClient.post<
      ApiResponse<{ id: number; browserKey: string; purgedVisitors: number }>
    >(`${this.endpoint}/admin-clients/register`, payload, {
      headers: { "x-skip-request-toast": "1" },
    });
  }
}

export const analyticsService = new AnalyticsService();
