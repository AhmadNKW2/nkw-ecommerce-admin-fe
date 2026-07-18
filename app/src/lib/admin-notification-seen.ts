const STORAGE_KEY = "admin_notification_seen_v1";

export type AdminNotificationSeenState = {
  notes: number;
  partners: number;
};

const DEFAULT_SEEN: AdminNotificationSeenState = {
  notes: 0,
  partners: 0,
};

function isFiniteCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function readAdminNotificationSeen(): AdminNotificationSeenState {
  if (typeof window === "undefined") return { ...DEFAULT_SEEN };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SEEN };

    const parsed = JSON.parse(raw) as Partial<AdminNotificationSeenState>;
    return {
      notes: isFiniteCount(parsed.notes) ? Math.floor(parsed.notes) : 0,
      partners: isFiniteCount(parsed.partners) ? Math.floor(parsed.partners) : 0,
    };
  } catch {
    return { ...DEFAULT_SEEN };
  }
}

export function writeAdminNotificationSeen(
  next: AdminNotificationSeenState,
): AdminNotificationSeenState {
  const normalized: AdminNotificationSeenState = {
    notes: Math.max(0, Math.floor(next.notes)),
    partners: Math.max(0, Math.floor(next.partners)),
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore quota / private-mode write failures.
    }
  }

  return normalized;
}

export function unreadFromSeen(total: number, seen: number): number {
  return Math.max(0, total - Math.max(0, seen));
}
