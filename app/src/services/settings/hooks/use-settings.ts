import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/query-keys';
import { QUERY_CONFIG } from '../../../lib/constants';
import {
  readStoredFeatureToggles,
  toFeatureToggles,
  writeStoredFeatureToggles,
  type StoredFeatureToggles,
} from '../../../lib/feature-toggles-cache';
import {
  readStoredSiteBranding,
  toCachedSeoSettings,
  writeStoredSiteBranding,
  type StoredSiteBranding,
} from '../../../lib/site-branding-cache';
import { applyBrandThemeToDocument, resolveBrandTheme } from '../../../lib/brand-theme';
import { showErrorToast, showSuccessToast } from '../../../lib/toast';
import { settingsService } from '../api/settings.service';
import {
  CreateProductPriceRuleDto,
  GenerateSeoDto,
  ImportedPricingAuditFilters,
  ImportedPricingAuditResult,
  ListMissingSeoFilters,
  SyncImportedPricingDto,
  SyncImportedPricingResult,
  UpdateFeatureTogglesDto,
  UpdateProductFieldTogglesDto,
  UpdateProductPriceRuleDto,
  UpdateSeoSettingsDto,
  UpdateSitePopupSettingsDto,
} from '../types/settings.types';

/**
 * localStorage is unavailable on the server. Reading it during the first client
 * render causes hydration mismatches (e.g. AdminLogo skeleton vs image).
 * Only apply cached placeholders after mount.
 */
function useClientStoredValue<T>(read: () => T | undefined): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    setValue(read());
  }, [read]);

  return value;
}

export async function fetchSeoSettings() {
  const response = await settingsService.getSeoSettings();
  writeStoredSiteBranding(response.data);
  return response;
}

export const useSeoSettings = (options?: { enabled?: boolean }) => {
  const storedBranding = useClientStoredValue<StoredSiteBranding>(
    readStoredSiteBranding,
  );

  return useQuery({
    queryKey: queryKeys.settings.seo(),
    queryFn: fetchSeoSettings,
    select: (response) => response.data,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    staleTime: QUERY_CONFIG.staleTime,
    placeholderData: storedBranding
      ? () => ({
          data: toCachedSeoSettings(storedBranding),
          success: true,
          message: "",
        })
      : undefined,
  });
};

export const useUpdateSeoSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSeoSettingsDto) =>
      settingsService.updateSeoSettings(data),
    onSuccess: (response) => {
      writeStoredSiteBranding(response.data);
      const branding = readStoredSiteBranding() ?? response.data;
      applyBrandThemeToDocument(resolveBrandTheme(branding));
      queryClient.setQueryData(queryKeys.settings.seo(), response);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast('SEO settings updated successfully');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to update SEO settings";
      showErrorToast(message);
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
  const storedToggles = useClientStoredValue<StoredFeatureToggles>(
    readStoredFeatureToggles,
  );

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

export const useSitePopupSettings = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.popup(),
    queryFn: () => settingsService.getSitePopupSettings(),
    select: (response) => response.data,
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
    staleTime: QUERY_CONFIG.staleTime,
  });
};

export const useUpdateSitePopupSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateSitePopupSettingsDto) =>
      settingsService.updateSitePopupSettings(data),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.settings.popup(), response);
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
      showSuccessToast('Site popup updated successfully');
    },
  });
};

export const useProductPriceRules = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.pricingRules(),
    queryFn: () => settingsService.getProductPriceRules(),
    select: (response) => response.data,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
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

export const useMissingSeo = (params: ListMissingSeoFilters, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.settings.seoMissing(params),
    queryFn: () => settingsService.listMissingSeo(params),
    enabled,
    refetchOnWindowFocus: false,
  });
};

export const useGenerateSeo = () => {
  return useMutation({
    mutationFn: (data: GenerateSeoDto) => settingsService.generateSeo(data),
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to start SEO generation";
      showErrorToast(message);
    },
  });
};