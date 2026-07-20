"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink, Layers, RefreshCw, Store } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { useCategoryVendorCategories } from "../../services/categories/hooks/use-categories";
import { CategoryVendorCategoriesGroup } from "../../services/categories/types/category.types";

interface CategoryVendorCategoriesSectionProps {
  categoryId: number;
}

export const CategoryVendorCategoriesSection: React.FC<
  CategoryVendorCategoriesSectionProps
> = ({ categoryId }) => {
  const {
    data: vendorGroups = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useCategoryVendorCategories(categoryId);

  const totalMappings = vendorGroups.reduce(
    (sum, group) => sum + group.vendor_categories.length,
    0
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Connected Vendor Categories</h2>
          <p className="mt-1 text-sm text-gray-500">
            Vendor categories mapped to this platform category, grouped by vendor.
          </p>
        </div>
        <Button
          type="button"
          color="var(--color-primary2)"
          onClick={() => refetch()}
          disabled={isFetching}
          className="shrink-0 gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading vendor category mappings...
        </div>
      ) : null}

      {isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="rounded-full bg-danger/10 p-3">
            <AlertCircle className="h-6 w-6 text-danger" />
          </div>
          <p className="text-sm text-gray-600">
            {error instanceof Error
              ? error.message
              : "Failed to load vendor category mappings"}
          </p>
          <Button type="button" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && vendorGroups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium text-gray-900">No vendor categories connected</p>
          <p className="max-w-md text-sm text-gray-500">
            Map this category from a vendor&apos;s category tree on the vendor edit
            page.
          </p>
        </div>
      ) : null}

      {!isLoading && !isError && vendorGroups.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            {totalMappings} mapping{totalMappings === 1 ? "" : "s"} across{" "}
            {vendorGroups.length} vendor{vendorGroups.length === 1 ? "" : "s"}
          </p>

          {vendorGroups.map((group) => (
            <VendorGroupCard key={group.vendor_id} group={group} />
          ))}
        </div>
      ) : null}
    </Card>
  );
};

const VendorGroupCard: React.FC<{ group: CategoryVendorCategoriesGroup }> = ({
  group,
}) => {
  return (
    <div className="rounded-lg border border-primary/10 bg-gray-50/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Store className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">
              {group.vendor_name_en || `Vendor #${group.vendor_id}`}
            </p>
            {group.vendor_name_ar ? (
              <p className="truncate text-sm text-gray-500" dir="rtl">
                {group.vendor_name_ar}
              </p>
            ) : null}
          </div>
          <Badge variant="default2">
            {group.vendor_categories.length} categor
            {group.vendor_categories.length === 1 ? "y" : "ies"}
          </Badge>
        </div>
        <Link
          href={`/vendors/${group.vendor_id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Open vendor
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="flex flex-col gap-2">
        {group.vendor_categories.map((vendorCategory) => (
          <li
            key={vendorCategory.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white bg-white px-3 py-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{vendorCategory.title}</p>
              {vendorCategory.parent_title ? (
                <p className="text-xs text-gray-500">
                  Parent: {vendorCategory.parent_title}
                </p>
              ) : (
                <p className="text-xs text-gray-400">Root vendor category</p>
              )}
            </div>
            {vendorCategory.reference_link?.trim() ? (
              <a
                href={vendorCategory.reference_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Reference
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="text-xs text-gray-400">No reference link</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
