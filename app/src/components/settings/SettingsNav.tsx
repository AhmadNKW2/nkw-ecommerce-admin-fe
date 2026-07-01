"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";
import { useSidebarCustomization } from "@/hooks/use-sidebar-customization";
import {
  SETTINGS_LINK_DEFINITIONS,
  filterSettingsLinksByFeatureToggle,
} from "@/lib/settings-links";

export function SettingsNav() {
  const pathname = usePathname();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();
  const { applyOrder } = useSidebarCustomization();

  const orderedLinks = applyOrder(SETTINGS_LINK_DEFINITIONS);
  const links = isResolved
    ? filterSettingsLinksByFeatureToggle(orderedLinks, (key) => isEnabled(key))
    : orderedLinks;

  return (
    <div className="w-full rounded-r1 border border-primary/20 bg-white p-2 shadow-s1">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
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
