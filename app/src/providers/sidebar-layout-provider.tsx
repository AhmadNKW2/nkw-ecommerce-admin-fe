"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { sidebarConfig } from "@/components/sidebar/sidebar.config";
import type { ReactNode as SidebarIcon } from "react";
import {
  buildLinkRegistry,
  getDefaultSidebarLayout,
  getSettingsLinksOrderFromLayout,
  mergeLayoutWithDefaults,
  normalizeSidebarLayout,
  type SidebarLayout,
  type SidebarLayoutGroup,
} from "@/lib/sidebar-layout";
import {
  resetSidebarLayoutStorage,
  saveSidebarLayout,
  type SidebarLayoutSaveResponse,
} from "@/services/settings/api/sidebar-layout.service";

const LAYOUT_STORAGE_KEY = "nkw_sidebar_layout";
const LEGACY_ORDER_STORAGE_KEY = "nkw_sidebar_settings_order";

type SidebarConfigLink = {
  href: string;
  label: string;
  icon: SidebarIcon;
  badge?: string | number;
  exact?: boolean;
  roles?: string[];
  featureToggle?: string;
  adminAccess?: string;
};

type SidebarConfigGroup = {
  label: string;
  icon: SidebarIcon;
  defaultOpen?: boolean;
  links: SidebarConfigLink[];
};

export type ResolvedSidebarGroup = {
  label: string;
  icon: SidebarIcon;
  defaultOpen?: boolean;
  links: SidebarConfigLink[];
};

type SidebarLayoutContextValue = {
  layout: SidebarLayout;
  layoutVersion: number;
  isReady: boolean;
  isCustomized: boolean;
  saveLayout: (nextLayout: SidebarLayout) => Promise<SidebarLayoutSaveResponse>;
  resetLayout: () => Promise<SidebarLayoutSaveResponse>;
  applyLayoutToGroups: (baseGroups: SidebarConfigGroup[]) => ResolvedSidebarGroup[];
  applyOrder: <T extends { href: string }>(items: T[]) => T[];
};

const SidebarLayoutContext = createContext<SidebarLayoutContextValue | null>(null);

function readInitialLayout(): SidebarLayout | null {
  if (typeof window === "undefined") return null;

  try {
    const rawLayout = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    const parsedLayout = rawLayout ? (JSON.parse(rawLayout) as SidebarLayout) : null;
    const rawLegacy = window.localStorage.getItem(LEGACY_ORDER_STORAGE_KEY);
    const parsedLegacy = rawLegacy ? (JSON.parse(rawLegacy) as string[]) : null;
    return mergeLayoutWithDefaults(parsedLayout, parsedLegacy);
  } catch {
    return getDefaultSidebarLayout();
  }
}

export function SidebarLayoutProvider({ children }: { children: ReactNode }) {
  const [storedLayout, setStoredLayout] = useState<SidebarLayout | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setStoredLayout(readInitialLayout());
    setIsReady(true);
  }, []);

  const layout = useMemo(
    () => normalizeSidebarLayout(storedLayout ?? getDefaultSidebarLayout(), buildLinkRegistry()),
    [storedLayout],
  );

  const saveLayout = useCallback(async (nextLayout: SidebarLayout) => {
    const response = await saveSidebarLayout(nextLayout);
    if (response.success) {
      setStoredLayout(response.data);
      setLayoutVersion((version) => version + 1);
    }
    return response;
  }, []);

  const resetLayout = useCallback(async () => {
    const response = await resetSidebarLayoutStorage();
    if (response.success) {
      setStoredLayout(null);
      setLayoutVersion((version) => version + 1);
    }
    return response;
  }, []);

  const applyLayoutToGroups = useCallback(
    (baseGroups: SidebarConfigGroup[]): ResolvedSidebarGroup[] => {
      const registry = buildLinkRegistry();
      const normalized = normalizeSidebarLayout(layout, registry);

      const linkLookup = new Map<string, SidebarConfigLink>();
      const groupMeta = new Map<
        string,
        { icon: SidebarIcon; defaultOpen?: boolean; label: string }
      >();

      for (const group of baseGroups) {
        for (const link of group.links) {
          linkLookup.set(link.href, link);
        }
        groupMeta.set(group.label.toLowerCase(), {
          icon: group.icon,
          defaultOpen: group.defaultOpen,
          label: group.label,
        });
      }

      const defaultLayout = getDefaultSidebarLayout();
      const defaultGroupMeta = new Map(
        baseGroups.map((group, index) => [
          defaultLayout.groups[index]?.id ?? group.label.toLowerCase(),
          group,
        ]),
      );

      const resolvedGroups: ResolvedSidebarGroup[] = [];

      for (const layoutGroup of normalized.groups) {
        const links = layoutGroup.linkHrefs
          .map((href) => linkLookup.get(href))
          .filter((link): link is SidebarConfigLink => Boolean(link));

        if (links.length === 0) continue;

        const defaultGroup =
          defaultGroupMeta.get(layoutGroup.id) ??
          baseGroups.find(
            (group) => group.label.toLowerCase() === layoutGroup.label.toLowerCase(),
          );
        const fallbackMeta = groupMeta.get(layoutGroup.label.toLowerCase());

        resolvedGroups.push({
          label: layoutGroup.label,
          icon: defaultGroup?.icon ?? fallbackMeta?.icon ?? baseGroups[0]?.icon,
          defaultOpen: defaultGroup?.defaultOpen ?? fallbackMeta?.defaultOpen ?? true,
          links,
        });
      }

      return resolvedGroups.length > 0 ? resolvedGroups : (baseGroups as ResolvedSidebarGroup[]);
    },
    [layout],
  );

  const applyOrder = useCallback(
    <T extends { href: string }>(items: T[]): T[] => {
      const order = getSettingsLinksOrderFromLayout(storedLayout);
      const indexMap = new Map(order.map((href, index) => [href, index]));

      return [...items].sort((a, b) => {
        const indexA = indexMap.get(a.href);
        const indexB = indexMap.get(b.href);
        if (indexA === undefined && indexB === undefined) return 0;
        if (indexA === undefined) return 1;
        if (indexB === undefined) return -1;
        return indexA - indexB;
      });
    },
    [storedLayout],
  );

  const value = useMemo(
    () => ({
      layout,
      layoutVersion,
      isReady,
      isCustomized: storedLayout !== null,
      saveLayout,
      resetLayout,
      applyLayoutToGroups,
      applyOrder,
    }),
    [
      layout,
      layoutVersion,
      isReady,
      storedLayout,
      saveLayout,
      resetLayout,
      applyLayoutToGroups,
      applyOrder,
    ],
  );

  return (
    <SidebarLayoutContext.Provider value={value}>{children}</SidebarLayoutContext.Provider>
  );
}

export function useSidebarCustomization() {
  const context = useContext(SidebarLayoutContext);
  if (!context) {
    throw new Error("useSidebarCustomization must be used within SidebarLayoutProvider");
  }
  return context;
}

export type { SidebarLayout, SidebarLayoutGroup };
