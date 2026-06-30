import type { SeoSettings } from "@/services/settings/types/settings.types";

export const DEFAULT_ADMIN_SITE_NAME = "Storefront";

const FAVICON_LINK_ID = "admin-dynamic-favicon";
const APPLE_TOUCH_LINK_ID = "admin-dynamic-apple-touch-icon";

const ENV_STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME?.trim();

function pickFirstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

export function resolveAdminSiteName(
  seoSettings?: Pick<SeoSettings, "site_name_en" | "site_name_ar"> | null,
) {
  return pickFirstNonEmpty(
    seoSettings?.site_name_en,
    seoSettings?.site_name_ar,
    ENV_STORE_NAME,
    DEFAULT_ADMIN_SITE_NAME,
  )!;
}

export function resolveAdminSiteLogo(
  seoSettings?: Pick<SeoSettings, "site_logo"> | null,
): string | null {
  const value = seoSettings?.site_logo?.trim();
  return value ? value : null;
}

export function getAdminDashboardTitle(
  seoSettings?: Pick<SeoSettings, "site_name_en" | "site_name_ar"> | null,
) {
  return `${resolveAdminSiteName(seoSettings)} Admin Dashboard`;
}

function withCacheBuster(url: string) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(Date.now()));
    return parsed.toString();
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}v=${Date.now()}`;
  }
}

function detectFaviconType(url: string) {
  const normalized = url.toLowerCase();

  if (normalized.includes(".svg")) {
    return "image/svg+xml";
  }

  if (normalized.includes(".jpg") || normalized.includes(".jpeg")) {
    return "image/jpeg";
  }

  if (normalized.includes(".webp")) {
    return "image/webp";
  }

  return "image/png";
}

function removeManagedFaviconLinks() {
  document.getElementById(FAVICON_LINK_ID)?.remove();
  document.getElementById(APPLE_TOUCH_LINK_ID)?.remove();
}

function removeForeignFaviconLinks() {
  document
    .querySelectorAll<HTMLLinkElement>('link[rel*="icon" i]')
    .forEach((link) => {
      if (
        link.id !== FAVICON_LINK_ID &&
        link.id !== APPLE_TOUCH_LINK_ID
      ) {
        link.remove();
      }
    });
}

function upsertFaviconLink({
  id,
  rel,
  href,
}: {
  id: string;
  rel: string;
  href: string;
}) {
  let link = document.getElementById(id) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = rel;
    document.head.appendChild(link);
  }

  link.type = detectFaviconType(href);
  link.href = withCacheBuster(href);
}

export function updateDocumentFavicon(href: string | null) {
  if (typeof document === "undefined") {
    return;
  }

  removeManagedFaviconLinks();
  removeForeignFaviconLinks();

  const nextHref = href?.trim();
  if (!nextHref) {
    return;
  }

  upsertFaviconLink({
    id: FAVICON_LINK_ID,
    rel: "icon",
    href: nextHref,
  });

  upsertFaviconLink({
    id: APPLE_TOUCH_LINK_ID,
    rel: "apple-touch-icon",
    href: nextHref,
  });
}
