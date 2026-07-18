"use client";

import { CategoryTreeSelect } from "@/components/products/CategoryTreeSelect";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ProductFilters, ProductStatus } from "@/services/products/types/product.types";
import type { Category } from "@/services/categories/types/category.types";
import { getStatusLabel, NO_CATEGORY_FILTER_VALUE, WORKFLOW_STATUSES } from "./product-filter-shared";

interface ProductFiltersPanelProps {
  visible?: boolean;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  selectedCategoryIds: string[];
  onCategoryChange: (ids: string[]) => void;
  categoryOptionsCount: number;
  vendorsEnabled: boolean;
  selectedVendorIds: string[];
  onVendorChange: (value: string | string[]) => void;
  vendorOptions: Array<{ value: string; label: string }>;
  selectedBrandIds: string[];
  onBrandChange: (value: string | string[]) => void;
  brandOptions: Array<{ value: string; label: string }>;
  startDate: string;
  endDate: string;
  onDateChange: (field: "start_date" | "end_date", value: string) => void;
  todayStr: string;
  selectedCreatedByIds: string[];
  onCreatedByChange: (value: string | string[]) => void;
  adminOptions: Array<{ value: string; label: string }>;
  createdByFilterEnabled?: boolean;
  showStatusFilter?: boolean;
  fixedStatus?: ProductStatus;
  queryParams: ProductFilters;
  onStatusFilterChange: (value: string | string[]) => void;
  onStockChange: (value: string | string[]) => void;
  onVisibilityChange: (value: string | string[]) => void;
  referenceLinksEnabled: boolean;
  onDuplicateReferenceLinkChange: (value: string | string[]) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
}

export function ProductFiltersPanel({
  visible = true,
  hasActiveFilters,
  onClearAllFilters,
  searchTerm,
  onSearchChange,
  categories,
  selectedCategoryIds,
  onCategoryChange,
  categoryOptionsCount,
  vendorsEnabled,
  selectedVendorIds,
  onVendorChange,
  vendorOptions,
  selectedBrandIds,
  onBrandChange,
  brandOptions,
  startDate,
  endDate,
  onDateChange,
  todayStr,
  selectedCreatedByIds,
  onCreatedByChange,
  adminOptions,
  createdByFilterEnabled = true,
  showStatusFilter = false,
  fixedStatus,
  queryParams,
  onStatusFilterChange,
  onStockChange,
  onVisibilityChange,
  referenceLinksEnabled,
  onDuplicateReferenceLinkChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}: ProductFiltersPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold ">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={onClearAllFilters}
            className="text-sm text-danger hover:text-danger2"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          label="Search"
          variant="search"
          maxLength={150}
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 z-50">
            <CategoryTreeSelect
              categories={categories}
              selectedIds={selectedCategoryIds}
              onChange={onCategoryChange}
              exclusiveOption={{ value: NO_CATEGORY_FILTER_VALUE, label: "No Category" }}
              singleSelect={false}
              label="Category"
              disabled={categoryOptionsCount === 0}
            />
          </div>

          {vendorsEnabled ? (
            <div className="relative flex-1">
              <Select
                label="Vendor"
                value={selectedVendorIds}
                onChange={onVendorChange}
                options={vendorOptions}
                search={vendorOptions.length > 6}
                multiple={true}
                placeholder="All Vendors"
                disabled={vendorOptions.length === 0}
              />
            </div>
          ) : null}

          <div className="relative flex-1">
            <Select
              label="Brand"
              value={selectedBrandIds}
              onChange={onBrandChange}
              options={brandOptions}
              search={brandOptions.length > 6}
              multiple={true}
              placeholder="All Brands"
              disabled={brandOptions.length === 0}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <DatePicker
              label="Create Start Date"
              value={startDate}
              onChange={(value) => onDateChange("start_date", value)}
              max={endDate || todayStr}
            />
          </div>

          <div className="relative flex-1">
            <DatePicker
              label="Create End Date"
              value={endDate}
              onChange={(value) => onDateChange("end_date", value)}
              min={startDate || undefined}
              max={todayStr}
            />
          </div>

          {createdByFilterEnabled ? (
            <div className="relative flex-1">
              <Select
                label="Created By"
                value={selectedCreatedByIds}
                onChange={onCreatedByChange}
                options={adminOptions}
                search={adminOptions.length > 6}
                multiple={true}
                placeholder="All Admins"
                disabled={adminOptions.length === 0}
              />
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          {showStatusFilter && !fixedStatus ? (
            <div className="relative flex-1">
              <Select
                label="Status"
                value={queryParams.status ?? ""}
                onChange={onStatusFilterChange}
                options={WORKFLOW_STATUSES.map((status) => ({
                  value: status,
                  label: getStatusLabel(status),
                }))}
                onClear={() => onStatusFilterChange("")}
                multiple={false}
                placeholder="All statuses"
              />
            </div>
          ) : null}
          <div className="relative flex-1">
            <Select
              label="Stock"
              value={
                queryParams.in_stock === true
                  ? "true"
                  : queryParams.in_stock === false
                    ? "false"
                    : ""
              }
              onChange={onStockChange}
              options={[
                { value: "true", label: "In Stock" },
                { value: "false", label: "Out of Stock" },
              ]}
              onClear={() => onStockChange("")}
              multiple={false}
              placeholder="All Stock Status"
            />
          </div>
          <div className="relative flex-1">
            <Select
              label="Visibility"
              value={
                queryParams.visible === true
                  ? "true"
                  : queryParams.visible === false
                    ? "false"
                    : ""
              }
              onChange={onVisibilityChange}
              options={[
                { value: "true", label: "Visible" },
                { value: "false", label: "Hidden" },
              ]}
              onClear={() => onVisibilityChange("")}
              multiple={false}
              placeholder="All Visibility"
            />
          </div>
          {referenceLinksEnabled ? (
            <div className="relative flex-1">
              <Select
                label="Reference Links"
                value={
                  queryParams.has_no_reference_link === true ||
                  queryParams.has_no_reference_link === "true"
                    ? "none"
                    : queryParams.has_duplicate_reference_link === true
                      ? "true"
                      : queryParams.has_duplicate_reference_link === false
                        ? "false"
                        : ""
                }
                onChange={onDuplicateReferenceLinkChange}
                options={[
                  { value: "true", label: "Duplicated Reference Links" },
                  { value: "false", label: "No Duplicated Reference Links" },
                  { value: "none", label: "With No Reference Link" },
                ]}
                onClear={() => onDuplicateReferenceLinkChange("")}
                multiple={false}
                placeholder="All Reference Links"
              />
            </div>
          ) : null}
          <div className="relative flex-1">
            <Input
              label="Min Price"
              type="number"
              value={minPrice}
              onChange={(event) => onMinPriceChange(event.target.value)}
              placeholder="0.00"
              min={0}
            />
          </div>
          <div className="relative flex-1">
            <Input
              label="Max Price"
              type="number"
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              placeholder="0.00"
              min={0}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
