import { analyticsService } from "@/services/analytics/api/analytics.service";
import { getOrCreateClientId } from "@/lib/admin-browser-key";
import { resolveDeviceModelHint } from "@/lib/device-model";

const ADMIN_MARKED_KEY = "ordonsooq_admin_marked";

let lastRegisteredKey: string | null = null;
let lastRegisteredAt = 0;
let inFlight: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const REREGISTER_MS = 60_000;
const REGISTER_MAX_ATTEMPTS = 3;
const REGISTER_BASE_DELAY_MS = 400;
/** If all attempts fail, try again later without waiting for a full page reload. */
const REGISTER_RETRY_LATER_MS = 15_000;

export function resetAdminClientDeviceRegistration() {
  lastRegisteredKey = null;
  lastRegisteredAt = 0;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableRegisterError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : "";

  const statusCode =
    error && typeof error === "object" && "statusCode" in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : NaN;

  if (statusCode === 401 || statusCode === 403 || statusCode === 400) {
    return false;
  }

  // statusCode 0 = browser/network failure from http-client
  if (
    statusCode === 0 ||
    statusCode >= 500 ||
    statusCode === 408 ||
    statusCode === 429
  ) {
    return true;
  }

  return /fetch failed|network|timeout|Failed to fetch|Upstream API proxy/i.test(
    message,
  );
}

function scheduleRegisterRetry(source: string) {
  if (typeof window === "undefined") return;
  if (retryTimer) return;

  retryTimer = setTimeout(() => {
    retryTimer = null;
    void registerAdminClientDevice(source);
  }, REGISTER_RETRY_LATER_MS);
}

/**
 * Admin logged in (dashboard) → take this browser's client id and mark it as admin.
 * Same `ordonsooq_browser_key` as the storefront — no separate admin id/cookie.
 */
export async function registerAdminClientDevice(
  source: string = "admin_fe",
): Promise<void> {
  if (typeof window === "undefined") return;

  const clientId = getOrCreateClientId();
  if (!clientId) return;

  const freshEnough =
    lastRegisteredKey === clientId &&
    Date.now() - lastRegisteredAt < REREGISTER_MS;

  if (freshEnough && !inFlight) return;

  if (inFlight) {
    await inFlight;
    return;
  }

  inFlight = (async () => {
    try {
      const deviceModel = await resolveDeviceModelHint();
      let lastError: unknown;

      for (let attempt = 1; attempt <= REGISTER_MAX_ATTEMPTS; attempt += 1) {
        try {
          await analyticsService.registerAdminClient({
            browserKey: clientId,
            source,
            userAgent: navigator.userAgent.slice(0, 512),
            ...(deviceModel ? { deviceModel } : {}),
          });
          window.localStorage.setItem(ADMIN_MARKED_KEY, "1");
          lastRegisteredKey = clientId;
          lastRegisteredAt = Date.now();
          if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
          }
          return;
        } catch (error) {
          lastError = error;
          if (
            attempt >= REGISTER_MAX_ATTEMPTS ||
            !isRetryableRegisterError(error)
          ) {
            break;
          }
          await sleep(REGISTER_BASE_DELAY_MS * 2 ** (attempt - 1));
        }
      }

      console.warn("Failed to mark client id as admin device", lastError);
      lastRegisteredKey = null;
      lastRegisteredAt = 0;
      scheduleRegisterRetry(source);
    } finally {
      inFlight = null;
    }
  })();

  await inFlight;
}
