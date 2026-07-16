"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth.context";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { QuickSubmitForm } from "@/components/vendor-submissions/QuickSubmitForm";
import { SubmissionsPanel } from "@/components/vendor-submissions/SubmissionsPanel";
import { CatalogRequestsPanel } from "@/components/vendor-submissions/CatalogRequestsPanel";
import {
  parseProductSubmissionsTab,
  type ProductSubmissionsTab,
} from "@/components/vendor-submissions/submission-status";

const ADMIN_TABS: { id: ProductSubmissionsTab; label: string }[] = [
  { id: "submissions", label: "Submissions" },
  { id: "brands", label: "Brands" },
  { id: "categories", label: "Categories" },
  { id: "specs", label: "Specs & attributes" },
  { id: "submit", label: "Quick submit" },
];

export default function ProductSubmissionsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isVendor = isSimplifiedProductCreator(user);

  const tabs = ADMIN_TABS;
  const tab = useMemo(() => {
    const parsed = parseProductSubmissionsTab(searchParams.get("tab"));
    if (parsed === "submit" || tabs.some((t) => t.id === parsed)) return parsed;
    return "submissions";
  }, [searchParams, tabs]);

  const setTab = (next: ProductSubmissionsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/product-submissions?${params.toString()}`);
  };

  useEffect(() => {
    if (isVendor) {
      router.replace("/products?create=1");
    }
  }, [isVendor, router]);

  if (isVendor) {
    return null;
  }

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Boxes />}
        title="AI Product Submissions"
        description="Review submissions, approve brand/category/specs, then create the product."
      />

      <Card>
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 h-10 rounded-r1 border transition-all ${
                tab === item.id
                  ? "bg-secondary text-white border-secondary"
                  : "border-secondary/40 text-gray-600 hover:bg-secondary/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === "submit" && (
        <QuickSubmitForm onSuccess={() => setTab("submissions")} />
      )}

      {tab === "submissions" && <SubmissionsPanel onOpenTab={setTab} />}
      {tab === "brands" && <CatalogRequestsPanel type="brand" />}
      {tab === "categories" && <CatalogRequestsPanel type="category" />}
      {tab === "specs" && <CatalogRequestsPanel type="specs" />}
    </div>
  );
}
