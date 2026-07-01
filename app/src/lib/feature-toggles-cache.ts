import type { QueryClient } from '@tanstack/react-query';
import type {
  FeatureToggles,
  UpdateFeatureTogglesDto,
} from '../services/settings/types/settings.types';
import { queryKeys } from './query-keys';

const STORAGE_KEY = 'nkw-admin-feature-toggles';
const LEGACY_STORAGE_KEY = 'nkw-admin-product-field-toggles';

export type StoredFeatureToggles = Omit<
  FeatureToggles,
  'id' | 'created_at' | 'updated_at'
>;

const DEFAULT_TOGGLES: StoredFeatureToggles = {
  vendors_enabled: true,
  ratings_enabled: true,
  attributes_enabled: true,
  specifications_enabled: true,
  weight_and_dimensions_enabled: true,
  partners_enabled: true,
  cashback_enabled: true,
  banners_enabled: true,
  import_ai_products_enabled: true,
  linked_products_enabled: true,
  reference_links_enabled: true,
  product_status_enabled: true,
  pricing_view_enabled: true,
  easy_purchase_enabled: false,
  cart_sidebar_button_enabled: true,
  popup_enabled: true,
  reference_link_visible_admin: true,
  meta_title_visible_admin: true,
  meta_description_visible_admin: true,
};

const STORED_TOGGLE_KEYS = Object.keys(
  DEFAULT_TOGGLES,
) as Array<keyof StoredFeatureToggles>;

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return Boolean(value) && typeof value === 'object';
}

function normalizeStored(value: unknown): StoredFeatureToggles | undefined {
  if (!isBooleanRecord(value)) {
    return undefined;
  }

  const hasCatalogKeys =
    typeof value.vendors_enabled === 'boolean' &&
    typeof value.attributes_enabled === 'boolean' &&
    typeof value.specifications_enabled === 'boolean';

  if (!hasCatalogKeys) {
    return undefined;
  }

  return {
    ...DEFAULT_TOGGLES,
    ...STORED_TOGGLE_KEYS.reduce((acc, key) => {
      if (typeof value[key] === 'boolean') {
        acc[key] = value[key];
      }
      return acc;
    }, {} as StoredFeatureToggles),
  };
}

function readStorageKey(key: string): StoredFeatureToggles | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return normalizeStored(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function readStoredFeatureToggles(): StoredFeatureToggles | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    readStorageKey(STORAGE_KEY) ?? readStorageKey(LEGACY_STORAGE_KEY)
  );
}

/** @deprecated Use readStoredFeatureToggles */
export const readCachedFeatureToggles = readStoredFeatureToggles;

export function writeStoredFeatureToggles(
  toggles: FeatureToggles | StoredFeatureToggles | UpdateFeatureTogglesDto,
): void {
  if (typeof window === 'undefined') return;

  const payload: StoredFeatureToggles = {
    ...DEFAULT_TOGGLES,
    ...STORED_TOGGLE_KEYS.reduce((acc, key) => {
      if (typeof toggles[key] === 'boolean') {
        acc[key] = toggles[key] as boolean;
      }
      return acc;
    }, {} as StoredFeatureToggles),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/** @deprecated Use writeStoredFeatureToggles */
export const writeCachedFeatureToggles = writeStoredFeatureToggles;

export function toFeatureToggles(
  stored: StoredFeatureToggles,
): FeatureToggles {
  return {
    id: 0,
    ...stored,
  };
}

export function toUpdateFeatureTogglesDto(
  toggles: FeatureToggles | StoredFeatureToggles | UpdateFeatureTogglesDto,
): UpdateFeatureTogglesDto {
  return STORED_TOGGLE_KEYS.reduce((acc, key) => {
    if (typeof toggles[key] === 'boolean') {
      acc[key] = toggles[key];
    }
    return acc;
  }, {} as UpdateFeatureTogglesDto);
}

export function clearStoredFeatureToggles(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/** @deprecated Use clearStoredFeatureToggles */
export const clearCachedFeatureToggles = clearStoredFeatureToggles;

export function hydrateFeatureTogglesQueryClient(
  queryClient: QueryClient,
): void {
  if (typeof window === 'undefined') return;

  const stored = readStoredFeatureToggles();
  if (!stored) return;

  const queryKey = queryKeys.settings.features();
  if (queryClient.getQueryData(queryKey)) return;

  queryClient.setQueryData(queryKey, {
    data: toFeatureToggles(stored),
    success: true,
    message: '',
  });
}
