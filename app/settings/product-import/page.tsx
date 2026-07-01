"use client";

import { AlertCircle } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { ProductImportTools } from "../../src/components/products/ProductImportTools";
import { Card } from "../../src/components/ui/card";
import { FeatureToggleGuard } from "../../src/components/settings/FeatureToggleGuard";

export default function ProductImportSettingsPage() {
  return (
    <FeatureToggleGuard toggle="import_ai_products_enabled">
      <div className="flex flex-col gap-5 p-5">
        <PageHeader
          icon={<AlertCircle />}
          title="Product Import"
          description="Bulk re-import review products and monitor AI import job progress."
        />
        <SettingsNav />
        <Card className="p-6">
          <ProductImportTools showBanner />
        </Card>
      </div>
    </FeatureToggleGuard>
  );
}
