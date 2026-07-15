import { analyticsService } from "@/services/analytics/api/analytics.service";
import {
  getAdminBrowserKey,
  setAdminClientCookie,
} from "@/lib/admin-browser-key";

let lastRegisteredKey: string | null = null;
let inFlight: Promise<void> | null = null;

/** Persist this admin browser/device so analytics visitors can ignore it. */
export async function registerAdminClientDevice(
  source: string = "admin_fe",
): Promise<void> {
  if (typeof window === "undefined") return;

  const browserKey = getAdminBrowserKey();
  if (!browserKey) return;

  setAdminClientCookie(browserKey);

  if (lastRegisteredKey === browserKey && !inFlight) {
    return;
  }

  if (inFlight) {
    await inFlight;
    return;
  }

  inFlight = (async () => {
    try {
      await analyticsService.registerAdminClient({
        browserKey,
        source,
        userAgent: navigator.userAgent.slice(0, 512),
      });
      lastRegisteredKey = browserKey;
    } catch (error) {
      console.warn("Failed to register admin client device", error);
    } finally {
      inFlight = null;
    }
  })();

  await inFlight;
}
