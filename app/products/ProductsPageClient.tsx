"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ProductListPage } from "../src/components/products/ProductListPage";
import { ProductReviewWorkspace } from "../src/components/products/ProductReviewWorkspace";
import { FeatureToggleGuard } from "../src/components/settings/FeatureToggleGuard";
import { useResolvedFeatureToggles } from "../src/hooks/use-resolved-feature-toggles";
import type { ProductStatus } from "../src/services/products/types/product.types";

const VALID_STATUSES = new Set<ProductStatus>(["active", "review", "updated"]);

export default function ProductsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isEnabled, isResolved } = useResolvedFeatureToggles();
  const importAiEnabled = isEnabled("import_ai_products_enabled");

  const viewMode = searchParams.get("view") === "review" ? "review" : "list";
  const statusParam = searchParams.get("status");
  const initialStatus =
    statusParam && VALID_STATUSES.has(statusParam as ProductStatus)
      ? (statusParam as ProductStatus)
      : undefined;

  const handleViewModeChange = (next: "list" | "review") => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "review") {
      params.set("view", "review");
    } else {
      params.delete("view");
    }
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
  };

  if (!isResolved) {
    return null;
  }

  if (viewMode === "review" && importAiEnabled) {
    return (
      <FeatureToggleGuard toggle="import_ai_products_enabled">
        <ProductReviewWorkspace
          hideImportActions
          title="Products"
          showViewToggle
          viewMode="review"
          onViewModeChange={handleViewModeChange}
        />
      </FeatureToggleGuard>
    );
  }

  return (
    <ProductListPage
      title="Products"
      description="Manage your product inventory"
      storageKey="products"
      showViewToggle={importAiEnabled}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      showStatusFilter={importAiEnabled}
      initialStatus={initialStatus}
    />
  );
}
