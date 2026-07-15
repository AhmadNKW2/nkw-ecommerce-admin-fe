/** Same client id key used by the storefront visitor tracker. */
export const CLIENT_ID_STORAGE_KEY = "ordonsooq_browser_key";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return "";
  try {
    return decodeURIComponent(match.slice(name.length + 1)).trim();
  } catch {
    return match.slice(name.length + 1).trim();
  }
}

/** Share client id across admin.* / www.* on the same registrable domain. */
function cookieDomain(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return null;
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return null;
  return `.${parts.slice(-2).join(".")}`;
}

function writeClientIdCookie(id: string) {
  if (typeof document === "undefined" || !id) return;
  const domain = cookieDomain();
  let value = `${CLIENT_ID_STORAGE_KEY}=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
  if (domain) value += `; domain=${domain}`;
  if (window.location.protocol === "https:") value += "; Secure";
  document.cookie = value;
}

function persistClientId(id: string) {
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
  writeClientIdCookie(id);
  return id;
}

/** Read existing client id — prefers shared cookie, then localStorage. */
export function peekClientId(): string {
  if (typeof window === "undefined") return "";
  const fromCookie = readCookie(CLIENT_ID_STORAGE_KEY);
  if (fromCookie) return fromCookie;
  return window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() || "";
}

/**
 * Get the single shared client id for this browser.
 * On *.ordonsooq.com, cookie syncs admin dashboard ↔ storefront.
 * Creates only if this browser has never had one.
 */
export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";

  const fromCookie = readCookie(CLIENT_ID_STORAGE_KEY);
  const fromStorage =
    window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() || "";

  // Prefer cookie so subdomain sites (admin + www) keep one identity.
  if (fromCookie) {
    if (fromStorage !== fromCookie) {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, fromCookie);
    }
    writeClientIdCookie(fromCookie);
    return fromCookie;
  }

  if (fromStorage) {
    return persistClientId(fromStorage);
  }

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return persistClientId(id);
}
