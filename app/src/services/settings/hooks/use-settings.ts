import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/query-keys';
import { QUERY_CONFIG } from '../../../lib/constants';
import {
  readStoredFeatureToggles,
  toFeatureToggles,
  writeStoredFeatureToggles,
} from '../../../lib/feature-toggles-cache';
import { showSuccessToast } from '../../../lib/toast';
import { settingsService } from '../api/settings.service';
import {
  BulkUpdateProductPricingDto,
  CreateProductPriceRuleDto,
  ImportedPricingAuditFilters,
  ImportedPricingAuditResult,
  SyncImportedPricingDto,
  SyncImportedPricingResult,
  UpdateFeatureTogglesDto,
  UpdateProductFieldTogglesDto,
  UpdateProductPriceRuleDto,
  UpdateSeoSettingsDto,
} from '../types/settings.types';

export const useSeoSettings = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.seo(),
    queryFn: () => settingsService.getSeoSettings(),
    select: (response) => response.data,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateSeoSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSeoSettingsDto) =>
      settingsService.updateSeoSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast('SEO settings updated successfully');
    },
  });
};

export async function fetchFeatureToggles() {
  const response = await settingsService.getFeatureToggles();
  writeStoredFeatureToggles(response.data);
  return response;
}

/** @deprecated Use fetchFeatureToggles */
export const fetchProductFieldToggles = fetchFeatureToggles;

export const useFeatureToggles = (options?: { enabled?: boolean }) => {
  const storedToggles = readStoredFeatureToggles();

  return useQuery({
    queryKey: queryKeys.settings.features(),
    queryFn: fetchFeatureToggles,
    select: (response) => response.data,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    staleTime: QUERY_CONFIG.staleTime,
    placeholderData: storedToggles
      ? () => ({
          data: toFeatureToggles(storedToggles),
          success: true,
          message: '',
        })
      : undefined,
  });
};

/** @deprecated Use useFeatureToggles */
export const useProductFieldToggles = useFeatureToggles;

export const useUpdateFeatureToggles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFeatureTogglesDto) =>
      settingsService.updateFeatureToggles(data),
    onSuccess: (response) => {
      writeStoredFeatureToggles(response.data);
      queryClient.setQueryData(queryKeys.settings.features(), response);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast('Feature settings updated successfully');
    },
  });
};

/** @deprecated Use useUpdateFeatureToggles */
export const useUpdateProductFieldToggles = useUpdateFeatureToggles;

export const useProductPriceRules = () => {
  return useQuery({
    queryKey: queryKeys.settings.pricingRules(),
    queryFn: () => settingsService.getProductPriceRules(),
    select: (response) => response.data,
    refetchOnWindowFocus: false,
  });
};

export const useCreateProductPriceRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductPriceRuleDto) =>
      settingsService.createProductPriceRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast('Pricing rule created successfully');
    },
  });
};

export const useUpdateProductPriceRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateProductPriceRuleDto;
    }) => settingsService.updateProductPriceRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast('Pricing rule updated successfully');
    },
  });
};

export const useDeleteProductPriceRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => settingsService.deleteProductPriceRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast('Pricing rule deleted successfully');
    },
  });
};

export const useRepriceExistingProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => settingsService.repriceExistingProducts(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast(
        `Repriced ${response.data.updated_count} products successfully`,
      );
    },
  });
};

export const useBulkUpdateProductPricing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateProductPricingDto) =>
      settingsService.bulkUpdateProductPricing(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      showSuccessToast(response.data.message);
    },
  });
};

export const useImportedPricingAudit = (
  params?: ImportedPricingAuditFilters,
) => {
  return useQuery({
    queryKey: queryKeys.settings.pricingAudit(params),
    queryFn: () => settingsService.getImportedPricingAudit(params),
    select: (response) => response.data,
    refetchOnWindowFocus: false,
  });
};

export const useSyncImportedPricing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SyncImportedPricingDto) =>
      settingsService.syncImportedPricing(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      const result = response.data;
      if (result.dry_run) {
        showSuccessToast(
          `Dry run completed for ${result.total_found} imported products`,
        );
        return;
      }
      showSuccessToast(
        `Imported pricing sync finished: ${result.updated ?? 0} updated, ${result.failed ?? 0} failed`,
      );
    },
  });
};