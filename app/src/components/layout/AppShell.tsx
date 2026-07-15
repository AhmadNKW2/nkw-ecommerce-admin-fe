"use client";

import { useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RouteAdminAccessGuard } from "../auth/RouteAdminAccessGuard";
import { AppSidebar } from "../sidebar/app-sidebar";
import { sidebarConfig } from "../sidebar/sidebar.config";
import { Sidebar, SidebarPanel, useSidebar } from "../sidebar/sidebar";
import { ScrollToTop } from "../common/ScrollToTop";
import { useLoading } from "../../providers/loading-provider";
import { fetchFeatureToggles } from "../../services/settings/hooks/use-settings";
import { queryKeys } from "../../lib/query-keys";
import { SidebarLayoutProvider } from "../../providers/sidebar-layout-provider";
import { useResolvedSiteBranding } from "../../hooks/use-resolved-site-branding";
import { AdminHeader } from "./AdminHeader";
import { RegisterAdminDashboardClient } from "../analytics/RegisterAdminDashboardClient";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mainRef = useRef<HTMLElement>(null);
  const { showOverlay } = useLoading();
  const { setMobileOpen } = useSidebar();
  const {
    dashboardTitle,
    siteName,
    siteLogo,
    isBrandingPending,
  } = useResolvedSiteBranding();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((document.activeElement as HTMLElement | null)?.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;
      router.back();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = dashboardTitle;
  }, [dashboardTitle]);

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.settings.features(),
      queryFn: fetchFeatureToggles,
    });
  }, [queryClient]);

  return (
    <div className="flex h-dvh flex-col bg-primary/10">
      <RegisterAdminDashboardClient />
      <AdminHeader
        siteName={siteName}
        siteLogo={siteLogo}
        isBrandingPending={isBrandingPending}
        onMenuClick={() => setMobileOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <SidebarPanel>
          <AppSidebar
            groups={sidebarConfig.groups}
            footer={sidebarConfig.footer}
          />
        </SidebarPanel>

        <main
          ref={mainRef}
          className="relative min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
        >
          {children}
          {showOverlay && <div className="absolute inset-0 z-9998" />}
        </main>

        <ScrollToTop scrollContainerRef={mainRef} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/login/");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute>
      <SidebarLayoutProvider>
        <Sidebar>
          <AppShellContent>
            <RouteAdminAccessGuard>{children}</RouteAdminAccessGuard>
          </AppShellContent>
        </Sidebar>
      </SidebarLayoutProvider>
    </ProtectedRoute>
  );
}
