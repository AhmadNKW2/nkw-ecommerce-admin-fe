"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth.context";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";
import { useSidebarCustomization } from "@/hooks/use-sidebar-customization";
import {
  SETTINGS_LINK_DEFINITIONS,
  filterSettingsLinksByAccess,
  filterSettingsLinksByFeatureToggle,
} from "@/lib/settings-links";

export function SettingsNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { canAccess } = useAdminAccess();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();
  const { applyOrder } = useSidebarCustomization();

  const orderedLinks = applyOrder(SETTINGS_LINK_DEFINITIONS);
  const accessFilteredLinks = filterSettingsLinksByAccess(orderedLinks, {
    role: user?.role,
    canAccess,
  });
  const links = isResolved
    ? filterSettingsLinksByFeatureToggle(accessFilteredLinks, (key) => isEnabled(key))
    : accessFilteredLinks;

  return (
    <div className="w-full rounded-r1 border border-primary/20 bg-white p-2 shadow-s1">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-gray-50 text-gray-600 hover:bg-primary/10 hover:text-primary"
              }`}
            >
              {link.navLabel}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
