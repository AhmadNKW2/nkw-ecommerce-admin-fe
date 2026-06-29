"use client";

import { ProductListPage } from "../../src/components/products/ProductListPage";
import { FeatureToggleGuard } from "../../src/components/settings/FeatureToggleGuard";

export default function UpdatedProductsPage() {
  return (
    <FeatureToggleGuard toggle="import_ai_products_enabled">
      <ProductListPage
        title="Updated Products"
        description="Manage products whose status is updated"
        storageKey="products_updated"
        fixedStatus="updated"
      />
    </FeatureToggleGuard>
  );
}