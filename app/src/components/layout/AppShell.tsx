"use client";

import { useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AppSidebar } from "../sidebar/app-sidebar";
import { sidebarConfig } from "../sidebar/sidebar.config";
import { Sidebar, SidebarPanel, useSidebar } from "../sidebar/sidebar";
import { ScrollToTop } from "../common/ScrollToTop";
import { useLoading } from "../../providers/loading-provider";
import {
  fetchFeatureToggles,
} from "../../services/settings/hooks/use-settings";
import { AdminLogo } from "../common/AdminLogo";
import { queryKeys } from "../../lib/query-keys";
import { SidebarLayoutProvider } from "../../providers/sidebar-layout-provider";
import { useResolvedSiteBranding } from "../../hooks/use-resolved-site-branding";
import { AdminTopHeader } from "./AdminTopHeader";

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

  const sidebarHeader = useMemo(
    () => ({
      ...sidebarConfig.header,
      title: siteName,
      subtitle: "Admin Dashboard",
      logo: (
        <AdminLogo
          src={siteLogo}
          pending={isBrandingPending}
          alt={siteName}
        />
      ),
    }),
    [siteName, siteLogo, isBrandingPending],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((document.activeElement as HTMLElement | null)?.isContentEditable) return;
      if (document.querySelector('[role="dialog"]')) return;
      router.back();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
    <div className="flex h-dvh bg-primary/10">
      <SidebarPanel>
        <AppSidebar
          groups={sidebarConfig.groups}
          header={sidebarHeader}
          footer={sidebarConfig.footer}
        />
      </SidebarPanel>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopHeader
          siteName={siteName}
          siteLogo={siteLogo}
          isBrandingPending={isBrandingPending}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main ref={mainRef} className="relative min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
          {showOverlay && (
            <div className="absolute inset-0 z-9998" />
          )}
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
          <AppShellContent>{children}</AppShellContent>
        </Sidebar>
      </SidebarLayoutProvider>
    </ProtectedRoute>
  );
}
