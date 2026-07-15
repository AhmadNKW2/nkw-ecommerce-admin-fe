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

/** Soft two-note chime (C6 → E6) with a light overtone — less harsh than a single beep. */
function playNotificationSound() {
  const audioContext = getAudioContext();
  if (!audioContext) return;

  try {
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(audioContext.destination);

    const notes: Array<{ freq: number; start: number; duration: number; peak: number }> = [
      { freq: 1046.5, start: 0, duration: 0.28, peak: 0.7 }, // C6
      { freq: 1318.5, start: 0.12, duration: 0.36, peak: 0.85 }, // E6
    ];

    for (const note of notes) {
      const osc = audioContext.createOscillator();
      const overtone = audioContext.createOscillator();
      const noteGain = audioContext.createGain();
      const start = now + note.start;
      const end = start + note.duration;

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, start);

      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(note.freq * 2, start);

      noteGain.gain.setValueAtTime(0.0001, start);
      noteGain.gain.exponentialRampToValueAtTime(note.peak, start + 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, end);

      const overtoneGain = audioContext.createGain();
      overtoneGain.gain.setValueAtTime(0.12, start);

      osc.connect(noteGain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(noteGain);
      noteGain.connect(master);

      osc.start(start);
      overtone.start(start);
      osc.stop(end + 0.02);
      overtone.stop(end + 0.02);
    }
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

function refreshNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // Keys must be ["orders"] / ["notes"] (not nested) so list queries match via prefix.
  void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
  void queryClient.refetchQueries({ queryKey: queryKeys.orders.all, type: "active" });
  void queryClient.refetchQueries({ queryKey: queryKeys.notes.all, type: "active" });
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
        refreshNotificationQueries(queryClient);
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
