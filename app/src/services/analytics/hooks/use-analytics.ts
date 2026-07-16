import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import { analyticsService } from "../api/analytics.service";
import type {
  AnalyticsDateCoverageScope,
  AnalyticsOverviewParams,
  AnalyticsPopularProductsParams,
  AnalyticsSearchQueriesParams,
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
        audience: "visitors",
      },
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
};

export const useAnalyticsPopularProducts = (
  params?: AnalyticsPopularProductsParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.analytics.popularProducts(params),
    queryFn: () => analyticsService.listPopularProducts(params),
    select: (response) => ({
      data: response.data || [],
      meta: response.meta || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        includeAdmin: false,
        sortBy: "views",
        sortOrder: "desc",
      },
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
};

export const useAnalyticsSearchQueries = (
  params?: AnalyticsSearchQueriesParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.analytics.searchQueries(params),
    queryFn: () => analyticsService.listSearchQueries(params),
    select: (response) => ({
      data: response.data || [],
      meta: response.meta || {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        includeAdmin: false,
        sortBy: "views",
        sortOrder: "desc",
      },
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  });
};

export const useAnalyticsDateCoverage = (
  scope: AnalyticsDateCoverageScope,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.analytics.dateCoverage(scope),
    queryFn: () => analyticsService.getDateCoverage(scope),
    select: (response) => response.data,
    staleTime: 60_000,
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
    onSuccess: (response, id) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      queryClient.removeQueries({ queryKey: queryKeys.analytics.visitor(id) });
      const browserKey = response?.data?.browserKey;
      showSuccessToast(
        browserKey
          ? `Client #${id} deleted (device unregistered)`
          : `Client #${id} deleted`,
      );
    },
  });
};

export const useRenameAdminClientDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, deviceName }: { deviceId: number; deviceName: string }) =>
      analyticsService.renameAdminClientDevice(deviceId, deviceName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
      showSuccessToast("Device name saved");
    },
  });
};
