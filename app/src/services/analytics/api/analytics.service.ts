import { httpClient } from "../../../lib/api/http-client";
import type { ApiResponse } from "../../../types/common.types";
import type {
  AnalyticsOverview,
  AnalyticsOverviewParams,
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
}

export const analyticsService = new AnalyticsService();
