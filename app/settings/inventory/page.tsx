"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Package } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import {
  useSeoSettings,
  useUpdateSeoSettings,
} from "../../src/services/settings/hooks/use-settings";
import { UpdateSeoSettingsDto } from "../../src/services/settings/types/settings.types";

export default function InventorySettingsPage() {
  const { data, isLoading, isError, error, refetch } = useSeoSettings();
  const updateSeoSettings = useUpdateSeoSettings();
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  useEffect(() => {
    if (!data) {
      return;
    }

    setLowStockThreshold(data.low_stock_threshold ?? 10);
  }, [data]);

  const handleSave = async () => {
    const payload: UpdateSeoSettingsDto = {
      low_stock_threshold: Number(lowStockThreshold) || 0,
    };

    await updateSeoSettings.mutateAsync(payload);
  };

  if (isError) {
    return (
      <div className="admin-page">
        <PageHeader
          icon={<Package />}
          title="Inventory Settings"
          description="Manage store-wide inventory rules."
        />
        <SettingsNav />
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold">Error Loading Inventory Settings</h3>
            <p className="mt-2 max-w-md mx-auto">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Package />}
        title="Inventory Settings"
        description="Configure store-wide inventory thresholds used across all products."
        action={{
          label: updateSeoSettings.isPending ? "Saving..." : "Save Settings",
          onClick: handleSave,
          disabled: isLoading || updateSeoSettings.isPending,
        }}
      />

      <SettingsNav />

      <Card>
        <h2 className="text-lg font-semibold">Low Stock Threshold</h2>
        <p className="mt-1 text-sm text-gray-500">
          When a product&apos;s quantity falls to this level or below, it is treated as low stock.
          This applies to every product and is no longer set per product.
        </p>

        <div className="mt-5 max-w-xs">
          <Input
            label="Low Stock Threshold"
            type="number"
            min={0}
            step={1}
            value={lowStockThreshold}
            onChange={(event) =>
              setLowStockThreshold(
                Number.isNaN(event.target.valueAsNumber)
                  ? 0
                  : event.target.valueAsNumber,
              )
            }
            disabled={isLoading || updateSeoSettings.isPending}
          />
        </div>
      </Card>
    </div>
  );
}
