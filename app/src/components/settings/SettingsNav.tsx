"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";

const settingsLinks = [
  { href: "/settings/seo", label: "SEO" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/features", label: "Feature Settings" },
  { href: "/settings/popup", label: "Site Popup" },
  { href: "/settings/inventory", label: "Inventory" },
  { href: "/settings/pricing", label: "Pricing Rules" },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();
  const importAiEnabled = isResolved && isEnabled("import_ai_products_enabled");

  const links = importAiEnabled
    ? [
        ...settingsLinks.slice(0, 4),
        { href: "/settings/product-import", label: "Product Import" },
        ...settingsLinks.slice(4),
      ]
    : settingsLinks;

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
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
