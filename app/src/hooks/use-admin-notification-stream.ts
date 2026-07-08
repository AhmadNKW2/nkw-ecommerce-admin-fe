"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

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

function playNotificationSound() {
  if (typeof window === "undefined") return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) return;

  try {
    const audioContext = new AudioContextCtor();
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

    window.setTimeout(() => {
      void audioContext.close();
    }, 350);
  } catch {
    // Ignore audio errors (browser autoplay restrictions, unsupported APIs, etc).
  }
}

export function useAdminNotificationStream() {
  const queryClient = useQueryClient();
  const lastSoundAtRef = useRef(0);
  const reconnectFallbackRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const source = new EventSource("/api/admin-notifications/stream", {
      withCredentials: true,
    });

    const triggerRefreshAndSound = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });

      const now = Date.now();
      if (now - lastSoundAtRef.current > 700) {
        playNotificationSound();
        lastSoundAtRef.current = now;
      }
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

    const onAnyMessage = (event: MessageEvent<string>) => {
      let rawPayload: MaybeWrappedStreamPayload | null = null;
      try {
        rawPayload = JSON.parse(event.data) as MaybeWrappedStreamPayload;
      } catch {
        return;
      }

      const payload = resolvePayload(rawPayload);
      if (!payload?.type || payload.type === undefined) return;
      if (payload.type !== "order.created" && payload.type !== "note.created") return;

      triggerRefreshAndSound();
    };

    source.addEventListener("notification", onAnyMessage as EventListener);
    source.addEventListener("message", onAnyMessage as EventListener);
    source.onmessage = onAnyMessage;
    source.onopen = () => {
      if (reconnectFallbackRef.current !== null) {
        window.clearInterval(reconnectFallbackRef.current);
        reconnectFallbackRef.current = null;
      }
    };
    source.onerror = () => {
      // If stream disconnects (auth/proxy/instance issue), keep badges fresh.
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
      if (reconnectFallbackRef.current === null) {
        reconnectFallbackRef.current = window.setInterval(() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
          void queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
        }, 15000);
      }
    };

    return () => {
      source.removeEventListener("notification", onAnyMessage as EventListener);
      source.removeEventListener("message", onAnyMessage as EventListener);
      source.close();
      if (reconnectFallbackRef.current !== null) {
        window.clearInterval(reconnectFallbackRef.current);
        reconnectFallbackRef.current = null;
      }
    };
  }, [queryClient]);
}
