import type { SeoSettings } from "@/services/settings/types/settings.types";
import type { ApiResponse } from "@/types/common.types";
import { getBackendOrigin } from "./backend-origin";

export async function fetchServerSeoSettings(): Promise<SeoSettings | null> {
  try {
    const response = await fetch(`${getBackendOrigin()}/settings/seo`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ApiResponse<SeoSettings>;
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchServerSiteLogoUrl(): Promise<string | null> {
  const settings = await fetchServerSeoSettings();
  const logo = settings?.site_logo?.trim();
  return logo || null;
}

export async function fetchSiteLogoImageResponse(): Promise<Response | null> {
  const logoUrl = await fetchServerSiteLogoUrl();

  if (!logoUrl) {
    return null;
  }

  try {
    const imageResponse = await fetch(logoUrl, { cache: "no-store" });

    if (!imageResponse.ok) {
      return null;
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/png";
    const buffer = await imageResponse.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return null;
  }
}
