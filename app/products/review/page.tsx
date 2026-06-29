"use client";

import { ProductReviewWorkspace } from "../../src/components/products/ProductReviewWorkspace";
import { FeatureToggleGuard } from "../../src/components/settings/FeatureToggleGuard";

export default function ReviewProductsPage() {
  return (
    <FeatureToggleGuard toggle="import_ai_products_enabled">
      <ProductReviewWorkspace />
    </FeatureToggleGuard>
  );
}