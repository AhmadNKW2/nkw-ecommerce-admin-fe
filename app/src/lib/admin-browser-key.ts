/** Same client id key used by the storefront visitor tracker. */
export const CLIENT_ID_STORAGE_KEY = "ordonsooq_browser_key";

/** Read existing client id — does not create one. */
export function peekClientId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)?.trim() || "";
}

/**
 * Get the single shared client id for this browser.
 * Creates only if this browser has never had one (same as storefront).
 */
export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";

  const existing = peekClientId();
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
  return id;
}
