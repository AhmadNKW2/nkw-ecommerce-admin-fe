"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth.context";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { useOrders } from "@/services/orders/hooks/use-orders";
import { useNotes } from "@/services/notes/hooks/use-notes";
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
  const { user } = useAuth();
  const isVendorPortalUser = isSimplifiedProductCreator(user);

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
        count: notesCount,
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
        href: "/product-submissions?tab=brands",
        count: catalogRequestsCount,
        tone: "warning",
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
  }, [isVendorPortalUser, notesCount, pendingOrdersCount, catalogRequestsCount]);

  const unreadCount = useMemo(
    () => notifications.reduce((sum, item) => sum + item.count, 0),
    [notifications],
  );

  const navBadges = useMemo(
    () => ({
      "/orders": pendingOrdersCount,
      "/notes": notesCount,
      "/product-submissions": catalogRequestsCount,
    }),
    [notesCount, pendingOrdersCount, catalogRequestsCount],
  );

  return {
    notifications,
    unreadCount,
    navBadges,
    isLoading: isVendorPortalUser
      ? false
      : pendingOrdersQuery.isLoading || notesQuery.isLoading,
  };
}
