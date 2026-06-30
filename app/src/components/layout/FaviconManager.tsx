"use client";

import { useEffect } from "react";
import { useResolvedSiteBranding } from "@/hooks/use-resolved-site-branding";
import { updateDocumentFavicon } from "@/lib/site-branding";

export function FaviconManager() {
  const { siteLogo, dashboardTitle, isResolved } = useResolvedSiteBranding();

  useEffect(() => {
    if (!isResolved || typeof document === "undefined") {
      return;
    }

    document.title = dashboardTitle;
    updateDocumentFavicon(siteLogo);
  }, [dashboardTitle, isResolved, siteLogo]);

  return null;
}
