import type { SidebarLayout } from "@/lib/sidebar-layout";
import {
  buildLinkRegistry,
  normalizeSidebarLayout,
} from "@/lib/sidebar-layout";

const LAYOUT_STORAGE_KEY = "nkw_sidebar_layout";

export type SidebarLayoutSaveResponse = {
  success: boolean;
  message: string;
  data: SidebarLayout;
};

export async function saveSidebarLayout(
  layout: SidebarLayout,
): Promise<SidebarLayoutSaveResponse> {
  const registry = buildLinkRegistry();
  const normalized = normalizeSidebarLayout(layout, registry);

  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(normalized));
    }

    return {
      success: true,
      message: "Sidebar layout saved successfully.",
      data: normalized,
    };
  } catch {
    return {
      success: false,
      message: "Failed to save sidebar layout.",
      data: normalized,
    };
  }
}

export async function resetSidebarLayoutStorage(): Promise<SidebarLayoutSaveResponse> {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
      window.localStorage.removeItem("nkw_sidebar_settings_order");
    }

    return {
      success: true,
      message: "Sidebar layout reset to default.",
      data: normalizeSidebarLayout({ groups: [] }, buildLinkRegistry()),
    };
  } catch {
    return {
      success: false,
      message: "Failed to reset sidebar layout.",
      data: normalizeSidebarLayout({ groups: [] }, buildLinkRegistry()),
    };
  }
}
