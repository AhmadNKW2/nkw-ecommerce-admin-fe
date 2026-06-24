"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsLinks = [
  { href: "/settings/seo", label: "SEO" },
  { href: "/settings/product-fields", label: "Product Fields" },
  { href: "/settings/pricing", label: "Pricing Rules" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="w-full rounded-r1 border border-primary/20 bg-white p-2 shadow-s1">
      <div className="flex flex-wrap gap-2">
        {settingsLinks.map((link) => {
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
