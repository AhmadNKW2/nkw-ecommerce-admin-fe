"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ProductListPage } from "../src/components/products/ProductListPage";
import { ProductReviewWorkspace } from "../src/components/products/ProductReviewWorkspace";
import { ProductPricingWorkspace } from "../src/components/products/ProductPricingWorkspace";
import { useAdminAccess } from "../src/hooks/use-admin-access";
import { useResolvedFeatureToggles } from "../src/hooks/use-resolved-feature-toggles";
import type { ProductStatus } from "../src/services/products/types/product.types";
import type { ProductsViewMode } from "../src/components/products/ProductsPageHeader";

const VALID_STATUSES = new Set<ProductStatus>(["active", "review", "updated", "archived"]);

export default function ProductsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();
  const { canEditProductPricing } = useAdminAccess();

  const productStatusEnabled = isEnabled("product_status_enabled");
  const pricingViewEnabled = isEnabled("pricing_view_enabled");
  const showPricingViewToggle = canEditProductPricing && pricingViewEnabled;

  const viewParam = searchParams.get("view");
  const viewMode: ProductsViewMode =
    viewParam === "review"
      ? "review"
      : viewParam === "pricing"
        ? "pricing"
        : "list";

  if (viewMode === "pricing" && !showPricingViewToggle) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
    return null;
  }

  const statusParam = searchParams.get("status");
  const initialStatus =
    productStatusEnabled &&
    statusParam &&
    VALID_STATUSES.has(statusParam as ProductStatus)
      ? (statusParam as ProductStatus)
      : undefined;

  if (productStatusEnabled === false && statusParam) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
    return null;
  }

  const visibleParam = searchParams.get("visible");
  const initialVisible =
    visibleParam === "true" ? true : visibleParam === "false" ? false : undefined;

  const handleViewModeChange = (next: ProductsViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") {
      params.delete("view");
    } else {
      params.set("view", next);
    }
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
  };

  const handleStatusCleared = () => {
    if (!statusParam) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("status");
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
  };

  if (!isResolved) {
    return null;
  }

  if (viewMode === "pricing") {
    return (
      <ProductPricingWorkspace
        title="Products"
        description="Manage product pricing in one place."
        storageKey="products"
        showViewToggle
        showPricingViewToggle={showPricingViewToggle}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        showStatusFilter={productStatusEnabled}
      />
    );
  }

  if (viewMode === "review") {
    return (
      <ProductReviewWorkspace
        hideImportActions
        title="Products"
        description="Manage your product inventory"
        storageKey="products"
        showViewToggle
        showPricingViewToggle={showPricingViewToggle}
        viewMode="review"
        onViewModeChange={handleViewModeChange}
        showStatusFilter={productStatusEnabled}
        initialStatus={initialStatus}
        onStatusCleared={handleStatusCleared}
        allowPriceEdit={false}
      />
    );
  }

  return (
    <ProductListPage
      title="Products"
      description="Manage your product inventory"
      storageKey="products"
      showViewToggle
      showPricingViewToggle={showPricingViewToggle}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
      showStatusFilter={productStatusEnabled}
      initialStatus={initialStatus}
      initialVisible={initialVisible}
      onStatusCleared={handleStatusCleared}
    />
  );
}
