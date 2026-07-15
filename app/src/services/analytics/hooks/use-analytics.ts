import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { analyticsService } from "../api/analytics.service";
import type { AnalyticsOverviewParams } from "../types/analytics.types";

export const useAnalyticsOverview = (params?: AnalyticsOverviewParams) => {
  return useQuery({
    queryKey: queryKeys.analytics.overview(params),
    queryFn: () => analyticsService.getOverview(params),
    select: (response) => response.data,
    staleTime: 60_000,
  });
};
