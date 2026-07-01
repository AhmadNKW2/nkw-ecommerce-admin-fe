"use client";

import { ArrowRightLeft, Coins, LayoutGrid, List, Package } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

export type ProductsViewMode = "list" | "review" | "pricing";

interface ProductsPageHeaderProps {
  title: string;
  description: string;
  onCreate: () => void;
  showViewToggle?: boolean;
  showPricingViewToggle?: boolean;
  showCreate?: boolean;
  viewMode?: ProductsViewMode;
  onViewModeChange?: (mode: ProductsViewMode) => void;
  showStatusFilter?: boolean;
  onBulkStatusClick?: () => void;
}

export function ProductsPageHeader({
  title,
  description,
  onCreate,
  showViewToggle = false,
  showPricingViewToggle = false,
  showCreate = true,
  viewMode = "list",
  onViewModeChange,
  showStatusFilter = false,
  onBulkStatusClick,
}: ProductsPageHeaderProps) {
  return (
    <PageHeader
      icon={<Package />}
      title={title}
      description={description}
      action={showCreate ? { label: "Create", onClick: onCreate } : undefined}
      extraActions={
        <>
          {showViewToggle && onViewModeChange ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={viewMode === "list" ? "solid" : "outline"}
                color="var(--color-primary2)"
                onClick={() => onViewModeChange("list")}
                className="rounded-full px-3 py-1.5 text-sm"
              >
                <List className="mr-1.5 inline h-4 w-4" />
                List view
              </Button>
              <Button
                variant={viewMode === "review" ? "solid" : "outline"}
                color="var(--color-primary2)"
                onClick={() => onViewModeChange("review")}
                className="rounded-full px-3 py-1.5 text-sm"
              >
                <LayoutGrid className="mr-1.5 inline h-4 w-4" />
                Review view
              </Button>
              {showPricingViewToggle ? (
                <Button
                  variant={viewMode === "pricing" ? "solid" : "outline"}
                  color="var(--color-primary2)"
                  onClick={() => onViewModeChange("pricing")}
                  className="rounded-full px-3 py-1.5 text-sm"
                >
                  <Coins className="mr-1.5 inline h-4 w-4" />
                  Pricing view
                </Button>
              ) : null}
            </div>
          ) : null}
          {showStatusFilter && onBulkStatusClick ? (
            <Button
              variant="outline"
              color="var(--color-primary2)"
              onClick={onBulkStatusClick}
              className="rounded-full px-4"
            >
              <ArrowRightLeft className="mr-2 inline h-4 w-4" />
              Bulk change status
            </Button>
          ) : null}
        </>
      }
    />
  );
}
