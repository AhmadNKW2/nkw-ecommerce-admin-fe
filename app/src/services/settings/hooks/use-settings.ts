import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/query-keys';
import { showSuccessToast } from '../../../lib/toast';
import { settingsService } from '../api/settings.service';
import {
  CreateProductPriceRuleDto,
  ImportedPricingAuditFilters,
  ImportedPricingAuditResult,
  SyncImportedPricingDto,
  SyncImportedPricingResult,
  UpdateProductPriceRuleDto,
  UpdateSeoSettingsDto,
} from '../types/settings.types';

export const useSeoSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings.seo(),
    queryFn: () => settingsService.getSeoSettings(),
    select: (response) => response.data,
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