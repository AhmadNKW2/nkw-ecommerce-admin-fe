"use client";

import { useEffect } from "react";
import { useSeoSettings } from "@/services/settings/hooks/use-settings";
import {
  applyBrandThemeToDocument,
  resolveBrandTheme,
} from "@/lib/brand-theme";

export function BrandThemeManager() {
  const { data, isPending, isPlaceholderData } = useSeoSettings();

  const isResolved = data !== undefined && (!isPending || isPlaceholderData);

  useEffect(() => {
    if (!isResolved) {
      return;
    }

    applyBrandThemeToDocument(resolveBrandTheme(data));
  }, [data, isResolved]);

  return null;
}
