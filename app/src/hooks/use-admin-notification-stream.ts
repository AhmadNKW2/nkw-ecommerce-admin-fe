"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth.context";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { queryKeys } from "@/lib/query-keys";
import { showInfoToast } from "@/lib/toast";

type AdminStreamEvent = {
  type?:
    | "order.created"
    | "note.created"
    | "submission.created"
    | "catalog_request.created";
  entityId?: number;
  createdAt?: string;
};

type MaybeWrappedStreamPayload =
  | AdminStreamEvent
  | {
      data?: AdminStreamEvent | { data?: AdminStreamEvent };
      success?: boolean;
    };

const NOTIFICATION_SOUND_SRC = "/sounds/notification.wav";

let sharedNotificationAudio: HTMLAudioElement | null = null;
let audioUnlockBound = false;

function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!sharedNotificationAudio) {
    const audio = new Audio(NOTIFICATION_SOUND_SRC);
    audio.preload = "auto";
    audio.volume = 0.85;
    sharedNotificationAudio = audio;
  }

  return sharedNotificationAudio;
}

function unlockNotificationAudio() {
  const audio = getNotificationAudio();
  if (!audio) return;

  // Priming play+pause unlocks autoplay after a user gesture.
  const priming = audio.play();
  if (priming) {
    void priming
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {
        // Ignore unlock failures until the next gesture.
      });
  }
}

function bindAudioUnlockOnce() {
  if (typeof window === "undefined" || audioUnlockBound) return;
  audioUnlockBound = true;

  const unlock = () => {
    unlockNotificationAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function playNotificationSound() {
  const audio = getNotificationAudio();
  if (!audio) return;

  try {
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore autoplay restrictions / missing asset errors.
    });
  } catch {
    // Ignore audio playback errors.
  }
}

function toastForEvent(type: AdminStreamEvent["type"], entityId?: number) {
  if (type === "order.created") {
    showInfoToast(
      typeof entityId === "number" ? `New order #${entityId} received` : "New order received",
    );
    return;
  }

  if (type === "note.created") {
    showInfoToast(
      typeof entityId === "number"
        ? `New customer note #${entityId}`
        : "New customer note received",
    );
    return;
  }

  if (type === "submission.created") {
    showInfoToast("New vendor AI product submission received");
    return;
  }

  if (type === "catalog_request.created") {
    showInfoToast("New catalog request awaiting approval");
  }
}

function refreshNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // Keys must be ["orders"] / ["notes"] (not nested) so list queries match via prefix.
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
  void queryClient.invalidateQueries({ queryKey: ["vendor-submissions"] });
  void queryClient.invalidateQueries({ queryKey: ["catalog-requests"] });
  void queryClient.refetchQueries({ queryKey: queryKeys.orders.all, type: "active" });
  void queryClient.refetchQueries({ queryKey: queryKeys.notes.all, type: "active" });
}

function refreshBadgeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // Lighter invalidation used while SSE is reconnecting — avoid thrashing list pages.
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
  void queryClient.invalidateQueries({
    queryKey: ["catalog-requests", "pending-count"],
  });
}

export function useAdminNotificationStream() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isVendorPortalUser = isSimplifiedProductCreator(user);
  const lastAlertAtRef = useRef(0);
  const reconnectFallbackRef = useRef<number | null>(null);
  const lastFallbackInvalidateAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Vendor/store portal users cannot access admin notification APIs.
    if (isVendorPortalUser) return;

    bindAudioUnlockOnce();

    const source = new EventSource("/api/admin-notifications/stream", {
      withCredentials: true,
    });

    const triggerRefreshSoundAndToast = (payload: AdminStreamEvent) => {
      refreshNotificationQueries(queryClient);

      const now = Date.now();
      if (now - lastAlertAtRef.current <= 700) return;
      lastAlertAtRef.current = now;

      playNotificationSound();
      toastForEvent(payload.type, payload.entityId);
    };

    const resolvePayload = (raw: MaybeWrappedStreamPayload | null): AdminStreamEvent | null => {
      if (!raw || typeof raw !== "object") return null;

      if ("type" in raw && typeof raw.type === "string") {
        return raw as AdminStreamEvent;
      }

      const outerData = "data" in raw ? raw.data : undefined;
      if (outerData && typeof outerData === "object") {
        if ("type" in outerData && typeof outerData.type === "string") {
          return outerData as AdminStreamEvent;
        }
        const nestedData =
          "data" in outerData ? (outerData as { data?: AdminStreamEvent }).data : undefined;
        if (nestedData && typeof nestedData === "object" && typeof nestedData.type === "string") {
          return nestedData;
        }
      }

      return null;
    };

    const onNotificationMessage = (event: MessageEvent<string>) => {
      let rawPayload: MaybeWrappedStreamPayload | null = null;
      try {
        rawPayload = JSON.parse(event.data) as MaybeWrappedStreamPayload;
      } catch {
        return;
      }

      const payload = resolvePayload(rawPayload);
      if (!payload?.type) return;
      const known = [
        "order.created",
        "note.created",
        "submission.created",
        "catalog_request.created",
      ];
      if (!known.includes(payload.type)) return;

      triggerRefreshSoundAndToast(payload);
    };

    // Nest emits `event: notification` — listen only to that named event.
    // Keep a single `message` fallback for servers that omit the event name.
    source.addEventListener("notification", onNotificationMessage as EventListener);
    source.onmessage = onNotificationMessage;

    source.onopen = () => {
      if (reconnectFallbackRef.current !== null) {
        window.clearInterval(reconnectFallbackRef.current);
        reconnectFallbackRef.current = null;
      }
    };

    source.onerror = () => {
      // EventSource auto-reconnects. Use a throttled poller only while disconnected.
      if (reconnectFallbackRef.current !== null) return;

      const invalidateBadgeQueries = () => {
        const now = Date.now();
        if (now - lastFallbackInvalidateAtRef.current < 10_000) return;
        lastFallbackInvalidateAtRef.current = now;
        refreshBadgeQueries(queryClient);
      };

      invalidateBadgeQueries();
      reconnectFallbackRef.current = window.setInterval(() => {
        invalidateBadgeQueries();
      }, 30_000);
    };

    return () => {
      source.removeEventListener("notification", onNotificationMessage as EventListener);
      source.onmessage = null;
      source.close();
      if (reconnectFallbackRef.current !== null) {
        window.clearInterval(reconnectFallbackRef.current);
        reconnectFallbackRef.current = null;
      }
    };
  }, [isVendorPortalUser, queryClient]);
}
