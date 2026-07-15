const STORAGE_KEY = "ordonsooq_admin_browser_key";
const COOKIE_NAME = "os_admin_client";

export function getAdminBrowserKey(): string {
  if (typeof window === "undefined") return "";

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return id;
}

/** Share marker with storefront on *.ordonsooq.com so admin browsing is ignored. */
export function setAdminClientCookie(browserKey: string) {
  if (typeof document === "undefined" || !browserKey) return;

  const maxAge = 60 * 60 * 24 * 400; // ~400 days
  const host = window.location.hostname;
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(browserKey)}`,
    "path=/",
    `max-age=${maxAge}`,
    "SameSite=Lax",
  ];

  if (host === "localhost" || host === "127.0.0.1") {
    document.cookie = parts.join("; ");
    return;
  }

  if (host.endsWith("ordonsooq.com")) {
    parts.push("domain=.ordonsooq.com");
    if (window.location.protocol === "https:") {
      parts.push("Secure");
    }
  }

  document.cookie = parts.join("; ");
}
