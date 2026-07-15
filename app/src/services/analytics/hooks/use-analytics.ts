import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import { analyticsService } from "../api/analytics.service";
import type {
  AnalyticsOverviewParams,
  AnalyticsVisitorsParams,
} from "../types/analytics.types";

export const useAnalyticsOverview = (
  params?: AnalyticsOverviewParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.analytics.overview(params),
    queryFn: () => analyticsService.getOverview(params),
    select: (response) => response.data,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
};

export const useAnalyticsVisitors = (
  params?: AnalyticsVisitorsParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.analytics.visitors(params),
    queryFn: () => analyticsService.listVisitors(params),
    select: (response) => ({
      data: response.data || [],
      meta: response.meta || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        showAdminVisitors: false,
      },
    }),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
};

export const useAnalyticsVisitor = (
  id: number | null,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.analytics.visitor(id || 0),
    queryFn: () => analyticsService.getVisitor(id!),
    select: (response) => response.data,
    enabled: (options?.enabled ?? true) && !!id,
  });
};

export const useDeleteAnalyticsVisitor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => analyticsService.deleteVisitor(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.removeQueries({ queryKey: queryKeys.analytics.visitor(id) });
      showSuccessToast(`Client #${id} deleted`);
    },
  });
};
