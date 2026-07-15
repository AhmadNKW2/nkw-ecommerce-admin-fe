import { analyticsService } from "@/services/analytics/api/analytics.service";
import { getOrCreateClientId } from "@/lib/admin-browser-key";

const ADMIN_MARKED_KEY = "ordonsooq_admin_marked";

let lastRegisteredKey: string | null = null;
let lastRegisteredAt = 0;
let inFlight: Promise<void> | null = null;

const REREGISTER_MS = 2_000;

export function resetAdminClientDeviceRegistration() {
  lastRegisteredKey = null;
  lastRegisteredAt = 0;
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
      await analyticsService.registerAdminClient({
        browserKey: clientId,
        source,
        userAgent: navigator.userAgent.slice(0, 512),
      });
      window.localStorage.setItem(ADMIN_MARKED_KEY, "1");
      lastRegisteredKey = clientId;
      lastRegisteredAt = Date.now();
    } catch (error) {
      console.warn("Failed to mark client id as admin device", error);
      lastRegisteredKey = null;
      lastRegisteredAt = 0;
    } finally {
      inFlight = null;
    }
  })();

  await inFlight;
}
