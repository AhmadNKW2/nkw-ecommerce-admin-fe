"use client";

import { useAuth } from "@/contexts/auth.context";
import { useVendorLocale } from "@/contexts/vendor-locale.context";
import { useResolvedSiteBranding } from "@/hooks/use-resolved-site-branding";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { useVendor } from "@/services/vendors/hooks/use-vendors";

/**
 * Branding for chrome (header / mobile drawer).
 * Vendor portal shows store logo + localized store name; others keep site SEO branding.
 */
export function useVendorPortalBranding() {
  const { user } = useAuth();
  const { lang, isVendorPortal } = useVendorLocale();
  const vendorId = user?.vendorId ?? null;
  const site = useResolvedSiteBranding();

  const vendorQuery = useVendor(vendorId ?? 0, {
    enabled: isVendorPortal && typeof vendorId === "number" && vendorId > 0,
  });

  const storeLogo =
    typeof vendorQuery.data?.logo === "string" && vendorQuery.data.logo.trim()
      ? vendorQuery.data.logo.trim()
      : null;

  const nameEn =
    typeof vendorQuery.data?.name_en === "string"
      ? vendorQuery.data.name_en.trim()
      : "";
  const nameAr =
    typeof vendorQuery.data?.name_ar === "string"
      ? vendorQuery.data.name_ar.trim()
      : "";

  const storeName =
    lang === "ar"
      ? nameAr || nameEn || null
      : nameEn || nameAr || null;

  const logo = isVendorPortal ? storeLogo : site.siteLogo;
  const displayName = isVendorPortal
    ? storeName || site.siteName
    : site.siteName;
  const isBrandingPending = isVendorPortal
    ? vendorQuery.isPending
    : site.isBrandingPending;

  return {
    logo,
    displayName,
    siteName: site.siteName,
    storeName,
    storeLogo,
    isVendorPortal,
    isBrandingPending,
  };
}
