"use client";

import type React from "react";
import { ArrowRightLeft, Coins, LayoutGrid, Link2, List, Package } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

export type ProductsViewMode = "list" | "review" | "pricing" | "reference-links";

interface ProductsPageHeaderProps {
  title: string;
  description: string;
  onCreate: () => void;
  createLabel?: string;
  showViewToggle?: boolean;
  showReviewViewToggle?: boolean;
  showPricingViewToggle?: boolean;
  showReferenceLinksViewToggle?: boolean;
  showCreate?: boolean;
  viewMode?: ProductsViewMode;
  onViewModeChange?: (mode: ProductsViewMode) => void;
  showStatusFilter?: boolean;
  onBulkStatusClick?: () => void;
  extraActions?: React.ReactNode;
}

export function ProductsPageHeader({
  title,
  description,
  onCreate,
  createLabel = "Create",
  showViewToggle = false,
  showReviewViewToggle = true,
  showPricingViewToggle = false,
  showReferenceLinksViewToggle = false,
  showCreate = true,
  viewMode = "list",
  onViewModeChange,
  showStatusFilter = false,
  onBulkStatusClick,
  extraActions,
}: ProductsPageHeaderProps) {
  return (
    <PageHeader
      icon={<Package />}
      title={title}
      description={description}
      action={showCreate ? { label: createLabel, onClick: onCreate } : undefined}
      extraActions={
        <>
          {extraActions}
          {showViewToggle && onViewModeChange ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={viewMode === "list" ? "solid" : "outline"}
                color="var(--color-primary2)"
                onClick={() => onViewModeChange("list")}
              >
                <List className="me-1.5 inline h-4 w-4" />
                List view
              </Button>
              {showReviewViewToggle ? (
                <Button
                  variant={viewMode === "review" ? "solid" : "outline"}
                  color="var(--color-primary2)"
                  onClick={() => onViewModeChange("review")}
                >
                  <LayoutGrid className="me-1.5 inline h-4 w-4" />
                  Review view
                </Button>
              ) : null}
              {showPricingViewToggle ? (
                <Button
                  variant={viewMode === "pricing" ? "solid" : "outline"}
                  color="var(--color-primary2)"
                  onClick={() => onViewModeChange("pricing")}
                >
                  <Coins className="me-1.5 inline h-4 w-4" />
                  Pricing view
                </Button>
              ) : null}
              {showReferenceLinksViewToggle ? (
                <Button
                  variant={viewMode === "reference-links" ? "solid" : "outline"}
                  color="var(--color-primary2)"
                  onClick={() => onViewModeChange("reference-links")}
                >
                  <Link2 className="me-1.5 inline h-4 w-4" />
                  Reference links
                </Button>
              ) : null}
            </div>
          ) : null}
          {showStatusFilter && onBulkStatusClick ? (
            <Button
              variant="outline"
              color="var(--color-primary2)"
              onClick={onBulkStatusClick}
            >
              <ArrowRightLeft className="me-2 inline h-4 w-4" />
              Bulk change status
            </Button>
          ) : null}
        </>
      }
    />
  );
}
