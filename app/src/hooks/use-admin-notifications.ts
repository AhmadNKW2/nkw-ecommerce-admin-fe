"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth.context";
import {
  readAdminNotificationSeen,
  unreadFromSeen,
  writeAdminNotificationSeen,
  type AdminNotificationSeenState,
} from "@/lib/admin-notification-seen";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { useOrders } from "@/services/orders/hooks/use-orders";
import { useNotes } from "@/services/notes/hooks/use-notes";
import { usePartners } from "@/services/partners/hooks/use-partners";
import { useCatalogRequestsPendingCount } from "@/services/vendor-submissions/hooks/use-vendor-submissions";

export type AdminNotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  tone: "warning" | "info" | "success";
};

type AdminNotificationState = {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  navBadges: Record<string, number>;
  isLoading: boolean;
};

function readNotesTotal(data: unknown): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (typeof data === "object" && data !== null) {
    const maybeTotal = (data as { total?: unknown }).total;
    if (typeof maybeTotal === "number" && Number.isFinite(maybeTotal)) {
      return Math.max(0, maybeTotal);
    }

    const maybeItems = (data as { items?: unknown }).items;
    if (Array.isArray(maybeItems)) {
      return maybeItems.length;
    }
  }
  return 0;
}

export function useAdminNotifications(): AdminNotificationState {
  const pathname = usePathname();
  const { user } = useAuth();
  const isVendorPortalUser = isSimplifiedProductCreator(user);
  const [seen, setSeen] = useState<AdminNotificationSeenState>(() =>
    readAdminNotificationSeen(),
  );

  const pendingOrdersQuery = useOrders(
    {
      page: 1,
      limit: 1,
      status: "pending",
    },
    { enabled: !isVendorPortalUser },
  );
  const notesQuery = useNotes(
    { page: 1, per_page: 1 },
    { enabled: !isVendorPortalUser },
  );
  const catalogRequestsQuery = useCatalogRequestsPendingCount({
    enabled: !isVendorPortalUser,
  });
  const partnersQuery = usePartners(
    { page: 1, limit: 1 },
    { enabled: !isVendorPortalUser },
  );

  const pendingOrdersCount = useMemo(() => {
    if (isVendorPortalUser) return 0;
    const total = pendingOrdersQuery.data?.meta?.total;
    if (typeof total === "number" && Number.isFinite(total)) {
      return Math.max(0, total);
    }
    return 0;
  }, [isVendorPortalUser, pendingOrdersQuery.data]);

  const notesCount = useMemo(() => {
    if (isVendorPortalUser) return 0;
    return readNotesTotal(notesQuery.data);
  }, [isVendorPortalUser, notesQuery.data]);

  const catalogRequestsCount = useMemo(() => {
    if (isVendorPortalUser) return 0;
    const count = catalogRequestsQuery.data;
    return typeof count === "number" && Number.isFinite(count)
      ? Math.max(0, count)
      : 0;
  }, [isVendorPortalUser, catalogRequestsQuery.data]);

  const partnersCount = useMemo(() => {
    if (isVendorPortalUser) return 0;
    const total = partnersQuery.data?.pagination?.total;
    if (typeof total === "number" && Number.isFinite(total)) {
      return Math.max(0, total);
    }
    return 0;
  }, [isVendorPortalUser, partnersQuery.data]);

  // Visiting notes/partners marks their badge counts as read.
  useEffect(() => {
    if (isVendorPortalUser) return;

    const onNotesPage = pathname === "/notes" || pathname?.startsWith("/notes/");
    const onPartnersPage =
      pathname === "/partners" || pathname?.startsWith("/partners/");

    if (!onNotesPage && !onPartnersPage) return;

    setSeen((prev) => {
      const next: AdminNotificationSeenState = {
        notes: onNotesPage ? Math.max(prev.notes, notesCount) : prev.notes,
        partners: onPartnersPage
          ? Math.max(prev.partners, partnersCount)
          : prev.partners,
      };

      if (next.notes === prev.notes && next.partners === prev.partners) {
        return prev;
      }

      return writeAdminNotificationSeen(next);
    });
  }, [isVendorPortalUser, notesCount, partnersCount, pathname]);

  const notesUnreadCount = useMemo(
    () => unreadFromSeen(notesCount, seen.notes),
    [notesCount, seen.notes],
  );

  const partnersUnreadCount = useMemo(
    () => unreadFromSeen(partnersCount, seen.partners),
    [partnersCount, seen.partners],
  );

  const notifications = useMemo<AdminNotificationItem[]>(() => {
    if (isVendorPortalUser) return [];

    const items: AdminNotificationItem[] = [];

    if (pendingOrdersCount > 0) {
      items.push({
        id: "pending-orders",
        title: "New Pending Orders",
        description: `${pendingOrdersCount} order${pendingOrdersCount === 1 ? "" : "s"} waiting for review`,
        href: "/orders",
        count: pendingOrdersCount,
        tone: "warning",
      });
    }

    if (notesCount > 0) {
      items.push({
        id: "new-notes",
        title: "Customer Notes",
        description: `${notesCount} note${notesCount === 1 ? "" : "s"} need follow-up`,
        href: "/notes",
        count: notesUnreadCount,
        tone: "info",
      });
    }

    if (catalogRequestsCount > 0) {
      items.push({
        id: "catalog-requests",
        title: "Catalog Requests",
        description: `${catalogRequestsCount} brand/category request${
          catalogRequestsCount === 1 ? "" : "s"
        } awaiting approval`,
        href: "/product-submissions",
        count: catalogRequestsCount,
        tone: "warning",
      });
    }

    if (partnersCount > 0) {
      items.push({
        id: "partner-leads",
        title: "Partner Leads",
        description: `${partnersCount} partner${partnersCount === 1 ? "" : "s"} awaiting follow-up`,
        href: "/partners",
        count: partnersUnreadCount,
        tone: "info",
      });
    }

    items.push({
      id: "system",
      title: "System Status",
      description: "Dashboard services are running normally",
      href: "/",
      count: 0,
      tone: "success",
    });

    return items;
  }, [
    isVendorPortalUser,
    notesCount,
    notesUnreadCount,
    pendingOrdersCount,
    catalogRequestsCount,
    partnersCount,
    partnersUnreadCount,
  ]);

  const unreadCount = useMemo(
    () => notifications.reduce((sum, item) => sum + item.count, 0),
    [notifications],
  );

  const navBadges = useMemo(
    () => ({
      "/orders": pendingOrdersCount,
      "/notes": notesUnreadCount,
      "/product-submissions": catalogRequestsCount,
      "/partners": partnersUnreadCount,
    }),
    [
      notesUnreadCount,
      pendingOrdersCount,
      catalogRequestsCount,
      partnersUnreadCount,
    ],
  );

  return {
    notifications,
    unreadCount,
    navBadges,
    isLoading: isVendorPortalUser
      ? false
      : pendingOrdersQuery.isLoading ||
        notesQuery.isLoading ||
        partnersQuery.isLoading,
  };
}
