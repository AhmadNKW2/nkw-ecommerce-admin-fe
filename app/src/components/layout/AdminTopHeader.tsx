"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { AdminLogo } from "../common/AdminLogo";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useAdminNotificationStream } from "@/hooks/use-admin-notification-stream";

type AdminTopHeaderProps = {
  siteName: string;
  siteLogo?: string | null;
  isBrandingPending?: boolean;
  onMenuClick: () => void;
};

function formatPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const normalized = pathname.split("?")[0];
  const section = normalized.split("/").filter(Boolean)[0] ?? "Dashboard";
  return section
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminTopHeader({
  siteName,
  siteLogo,
  isBrandingPending,
  onMenuClick,
}: AdminTopHeaderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading } = useAdminNotifications();
  useAdminNotificationStream();

  const pageTitle = useMemo(() => formatPageTitle(pathname), [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-b1 bg-white/95 px-3 py-2 backdrop-blur-sm sm:px-4 lg:px-6">
      <div className="flex min-h-12 items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r2 text-primary transition-colors hover:bg-primary/10 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="shrink-0 [&_img]:h-8 [&_img]:w-8 [&>div]:h-8 [&>div]:w-8 sm:[&_img]:h-9 sm:[&_img]:w-9 sm:[&>div]:h-9 sm:[&>div]:w-9">
            <AdminLogo src={siteLogo} pending={isBrandingPending} alt={siteName} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">{pageTitle}</p>
            <p className="truncate text-xs text-gray-500">{siteName} Admin Panel</p>
          </div>
        </div>

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-r2 border border-b1 bg-white text-primary transition-colors hover:bg-primary/10"
            aria-label="Open notifications"
            aria-expanded={isOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>

          {isOpen ? (
            <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-r1 border border-b1 bg-white shadow-s1">
              <div className="flex items-center justify-between border-b border-b1 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                  {unreadCount} new
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">Loading updates...</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-500">No new notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      className="flex items-start justify-between gap-3 border-b border-b1/70 px-4 py-3 transition-colors hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-600">{notification.description}</p>
                      </div>
                      {notification.count > 0 ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            notification.tone === "warning"
                              ? "bg-secondary/20 text-yellow-700"
                              : notification.tone === "success"
                                ? "bg-success/15 text-green-700"
                                : "bg-primary/15 text-primary"
                          }`}
                        >
                          {notification.count}
                        </span>
                      ) : null}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
