"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { showInfoToast } from "@/lib/toast";

type AdminStreamEvent = {
  type?: "order.created" | "note.created";
  entityId?: number;
  createdAt?: string;
};

type MaybeWrappedStreamPayload =
  | AdminStreamEvent
  | {
      data?: AdminStreamEvent | { data?: AdminStreamEvent };
      success?: boolean;
    };

let sharedAudioContext: AudioContext | null = null;
let audioUnlockBound = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioContextCtor();
  }

  return sharedAudioContext;
}

function unlockNotificationAudio() {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => {
      // Ignore autoplay unlock failures.
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
  const audioContext = getAudioContext();
  if (!audioContext) return;

  try {
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(1100, now + 0.08);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.13, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.26);
  } catch {
    // Ignore audio errors (browser autoplay restrictions, unsupported APIs, etc).
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
  }
}

export function useAdminNotificationStream() {
  const queryClient = useQueryClient();
  const lastAlertAtRef = useRef(0);
  const reconnectFallbackRef = useRef<number | null>(null);
  const lastFallbackInvalidateAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    bindAudioUnlockOnce();

    const source = new EventSource("/api/admin-notifications/stream", {
      withCredentials: true,
    });

    const triggerRefreshSoundAndToast = (payload: AdminStreamEvent) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });

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
      if (payload.type !== "order.created" && payload.type !== "note.created") return;

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
        void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all, refetchType: "active" });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all, refetchType: "active" });
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
  }, [queryClient]);
}
