"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductListPage } from "../src/components/products/ProductListPage";
import { ProductReviewWorkspace } from "../src/components/products/ProductReviewWorkspace";
import { ProductPricingWorkspace } from "../src/components/products/ProductPricingWorkspace";
import { ProductReferenceLinksWorkspace } from "../src/components/products/ProductReferenceLinksWorkspace";
import { useAuth } from "../src/contexts/auth.context";
import { useAdminAccess } from "../src/hooks/use-admin-access";
import { useResolvedFeatureToggles } from "../src/hooks/use-resolved-feature-toggles";
import { isSimplifiedProductCreator } from "../src/lib/simplified-product-creator";
import type { ProductStatus } from "../src/services/products/types/product.types";
import type { ProductsViewMode } from "../src/components/products/ProductsPageHeader";

const VALID_STATUSES = new Set<ProductStatus>(["active", "review", "updated", "archived"]);

export default function ProductsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { isResolved, isEnabled } = useResolvedFeatureToggles();
  const { canEditProductPricing } = useAdminAccess();
  const isVendorPortalUser = isSimplifiedProductCreator(user);
  const [openVendorQuickSubmit] = useState(
    () => searchParams.get("create") === "1",
  );

  useEffect(() => {
    if (!isVendorPortalUser || searchParams.get("create") !== "1") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("create");
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
  }, [isVendorPortalUser, router, searchParams]);

  const productStatusEnabled = isEnabled("product_status_enabled");
  const pricingViewEnabled = isEnabled("pricing_view_enabled");
  const referenceLinksViewEnabled = isEnabled("reference_links_enabled");
  const showReviewViewToggle = !isVendorPortalUser;
  const showPricingViewToggle =
    !isVendorPortalUser && canEditProductPricing && pricingViewEnabled;
  const showReferenceLinksViewToggle =
    !isVendorPortalUser && referenceLinksViewEnabled;
  const showBulkStatusChange = !isVendorPortalUser && productStatusEnabled;
  const showStatusFilter = !isVendorPortalUser && productStatusEnabled;

  const viewParam = searchParams.get("view");
  const viewMode: ProductsViewMode =
    viewParam === "review"
      ? "review"
      : viewParam === "pricing"
        ? "pricing"
        : viewParam === "reference-links"
          ? "reference-links"
          : "list";

  const redirectToList = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    const query = params.toString();
    router.replace(query ? `/products?${query}` : "/products");
  };

  if (viewMode === "pricing" && !showPricingViewToggle) {
    redirectToList();
    return null;
  }

  if (viewMode === "reference-links" && !showReferenceLinksViewToggle) {
    redirectToList();
    return null;
  }

  if (viewMode === "review" && !showReviewViewToggle) {
    redirectToList();
    return null;
  }

  const statusParam = searchParams.get("status");
  const initialStatus =
    showStatusFilter &&
    statusParam &&
    VALID_STATUSES.has(statusParam as ProductStatus)
      ? (statusParam as ProductStatus)
      : undefined;

  if (!showStatusFilter && statusParam) {
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

  const sharedViewProps = {
    // Vendor/store portal only has the list — hide the lone "List view" button.
    showViewToggle: !isVendorPortalUser,
    showReviewViewToggle,
    showPricingViewToggle,
    showReferenceLinksViewToggle,
    viewMode,
    onViewModeChange: handleViewModeChange,
    showStatusFilter,
    showBulkStatusChange,
  };

  if (viewMode === "pricing") {
    return (
      <ProductPricingWorkspace
        title="Products"
        description="Manage product pricing in one place."
        storageKey="products"
        {...sharedViewProps}
      />
    );
  }

  if (viewMode === "reference-links") {
    return (
      <ProductReferenceLinksWorkspace
        title="Products"
        description="Clean up duplicate supplier references and inspect products by link or slug."
        {...sharedViewProps}
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
        {...sharedViewProps}
        viewMode="review"
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
      {...sharedViewProps}
      initialStatus={initialStatus}
      initialVisible={initialVisible}
      onStatusCleared={handleStatusCleared}
      initialShowQuickSubmit={isVendorPortalUser && openVendorQuickSubmit}
    />
  );
}
