import { useFeatureToggles } from '../services/settings/hooks/use-settings';
import type { FeatureToggles } from '../services/settings/types/settings.types';

export type FeatureToggleKey = keyof Omit<
  FeatureToggles,
  'id' | 'created_at' | 'updated_at'
>;

export function useResolvedFeatureToggles(options?: { enabled?: boolean }) {
  const query = useFeatureToggles(options);
  const { data, isPending, isPlaceholderData } = query;

  const isResolved =
    data !== undefined && (!isPending || isPlaceholderData);

  const isEnabled = (key: FeatureToggleKey): boolean => {
    if (!isResolved) {
      return false;
    }

    return data?.[key] !== false;
  };

  return {
    ...query,
    toggles: data,
    isResolved,
    isVisibilityPending: !isResolved,
    isEnabled,
  };
}

/** @deprecated Use useResolvedFeatureToggles */
export const useResolvedProductFieldToggles = useResolvedFeatureToggles;
