"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronLeft, Menu } from "lucide-react";
import { AdminLogo } from "../common/AdminLogo";
import { useSidebar } from "../sidebar/sidebar";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useAdminNotificationStream } from "@/hooks/use-admin-notification-stream";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_HEADER_SLOT_ID = "admin-page-header-slot";

type AdminHeaderProps = {
  siteName: string;
  siteLogo?: string | null;
  isBrandingPending?: boolean;
  onMenuClick: () => void;
};

export function AdminHeader({
  siteName,
  siteLogo,
  isBrandingPending,
  onMenuClick,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapsed, isMobile } = useSidebar();
  const showCollapsed = isCollapsed && !isMobile;

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading } = useAdminNotifications();
  useAdminNotificationStream();

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
    <header className="sticky top-0 z-30 flex min-h-18 shrink-0 items-stretch border-b border-b1 bg-[#ffffff]">
      {/* Branding — width tracks the sidebar */}
      <div
        className={cn(
          "relative flex shrink-0 items-center gap-3 border-r border-b1 px-3 transition-[width] duration-300 ease-in-out sm:px-4",
          showCollapsed ? "lg:w-18 lg:justify-center lg:px-2" : "lg:w-70",
        )}
      >
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r2 text-primary transition-colors hover:bg-primary/10 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          className={cn(
            "shrink-0 [&>div]:h-11 [&>div]:w-11 [&_img]:h-11 [&_img]:w-11",
            showCollapsed && "lg:mx-auto",
          )}
        >
          <AdminLogo src={siteLogo} pending={isBrandingPending} alt={siteName} />
        </div>

        <div className={cn("min-w-0", showCollapsed && "lg:hidden")}>
          <h1 className="truncate text-sm font-bold leading-snug text-gray-900 sm:text-base">
            {siteName}
          </h1>
          <p className="truncate text-xs leading-snug text-gray-500">Admin Dashboard</p>
        </div>

        {!isMobile && (
          <button
            type="button"
            onClick={toggleCollapsed}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="
              absolute -right-3.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2
              items-center justify-center rounded-full shrink-0
              bg-white text-primary
              shadow-[0_2px_8px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.06)]
              hover:shadow-[0_4px_12px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.08)]
              hover:scale-110 transition-all duration-200 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
            "
          >
            <ChevronLeft
              size={15}
              strokeWidth={2.5}
              className={cn(
                "transition-transform duration-300 ease-in-out",
                isCollapsed ? "rotate-180" : "rotate-0",
              )}
            />
          </button>
        )}
      </div>

      {/* Page header slot — PageHeader renders into this via a portal */}
      <div
        id={ADMIN_PAGE_HEADER_SLOT_ID}
        className="flex min-w-0 flex-1 items-center px-3 sm:px-4 lg:px-6"
      />

      {/* Actions */}
      <div className="flex items-center justify-end pr-3 sm:pr-4 lg:pr-6">
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
