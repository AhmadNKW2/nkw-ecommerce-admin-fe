"use client";

import { useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
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

function MobileTopBar({
  title,
  logo,
  onMenuClick,
}: {
  title: string;
  logo: React.ReactNode;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-b1 bg-white px-3 shadow-s1 lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-r2 text-primary transition-colors hover:bg-primary/10"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="shrink-0 [&_img]:h-8 [&_img]:w-8 [&>div]:h-8 [&>div]:w-8">
          {logo}
        </div>
        <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
      </div>
    </header>
  );
}

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
        <MobileTopBar
          title={siteName}
          logo={
            <AdminLogo
              src={siteLogo}
              pending={isBrandingPending}
              alt={siteName}
            />
          }
          onMenuClick={() => setMobileOpen(true)}
        />
        <main ref={mainRef} className="relative min-h-0 flex-1 overflow-auto">
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
