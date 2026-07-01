"use client";

import { useState } from "react";
import { CategoryTreeSelect } from "@/components/products/CategoryTreeSelect";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useBulkUpdateProductStatus } from "@/services/products/hooks/use-products";
import type { Category } from "@/services/categories/types/category.types";
import type { ProductStatus } from "@/services/products/types/product.types";
import { getStatusLabel, NO_VENDOR_FILTER_VALUE, WORKFLOW_STATUSES } from "./product-filter-shared";

interface ProductBulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorsEnabled: boolean;
  vendorOptions: Array<{ value: string; label: string }>;
  categories: Category[];
  onSuccess?: () => void;
}

export function ProductBulkStatusModal({
  isOpen,
  onClose,
  vendorsEnabled,
  vendorOptions,
  categories,
  onSuccess,
}: ProductBulkStatusModalProps) {
  const bulkUpdateStatus = useBulkUpdateProductStatus();
  const [bulkFromStatus, setBulkFromStatus] = useState<ProductStatus>("updated");
  const [bulkToStatus, setBulkToStatus] = useState<ProductStatus>("review");
  const [bulkStatusVendorId, setBulkStatusVendorId] = useState("");
  const [bulkStatusCategoryIds, setBulkStatusCategoryIds] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (bulkFromStatus === bulkToStatus) {
      return;
    }

    try {
      const payload: {
        from_status: ProductStatus;
        to_status: ProductStatus;
        vendor_id?: number;
        category_id?: number;
      } = {
        from_status: bulkFromStatus,
        to_status: bulkToStatus,
      };

      const parsedVendorId = Number(bulkStatusVendorId);
      const parsedCategoryId = Number(bulkStatusCategoryIds[0] ?? "");

      if (Number.isInteger(parsedVendorId) && parsedVendorId > 0) {
        payload.vendor_id = parsedVendorId;
      }
      if (Number.isInteger(parsedCategoryId) && parsedCategoryId > 0) {
        payload.category_id = parsedCategoryId;
      }

      await bulkUpdateStatus.mutateAsync(payload);
      onClose();
      onSuccess?.();
    } catch (bulkError) {
      console.error("Failed to bulk update product statuses:", bulkError);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!bulkUpdateStatus.isPending) {
          onClose();
        }
      }}
      className="self-start w-full max-w-3xl"
    >
      <div className="flex flex-col gap-6">
        <div className="space-y-2 pr-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Bulk change product status
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            Move every product with the current status to a new status. Optional vendor and
            category filters narrow the update.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Current status"
            value={bulkFromStatus}
            onChange={(value) => {
              const normalized = Array.isArray(value) ? value[0] : value;
              if (WORKFLOW_STATUSES.includes(normalized as ProductStatus)) {
                setBulkFromStatus(normalized as ProductStatus);
              }
            }}
            options={WORKFLOW_STATUSES.map((status) => ({
              value: status,
              label: getStatusLabel(status),
            }))}
            multiple={false}
            disabled={bulkUpdateStatus.isPending}
          />
          <Select
            label="New status"
            value={bulkToStatus}
            onChange={(value) => {
              const normalized = Array.isArray(value) ? value[0] : value;
              if (WORKFLOW_STATUSES.includes(normalized as ProductStatus)) {
                setBulkToStatus(normalized as ProductStatus);
              }
            }}
            options={WORKFLOW_STATUSES.map((status) => ({
              value: status,
              label: getStatusLabel(status),
            }))}
            multiple={false}
            disabled={bulkUpdateStatus.isPending}
          />
        </div>

        <div
          className={`grid gap-4 ${
            vendorsEnabled
              ? "xl:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)]"
              : "grid-cols-1"
          }`}
        >
          {vendorsEnabled ? (
            <Select
              label="Vendor filter (optional)"
              value={bulkStatusVendorId}
              onChange={(value) =>
                setBulkStatusVendorId(Array.isArray(value) ? value[0] ?? "" : value)
              }
              options={vendorOptions.filter((option) => option.value !== NO_VENDOR_FILTER_VALUE)}
              search={vendorOptions.length > 6}
              multiple={false}
              placeholder="All vendors"
              disabled={bulkUpdateStatus.isPending}
            />
          ) : null}
          <CategoryTreeSelect
            categories={categories}
            selectedIds={bulkStatusCategoryIds}
            onChange={(ids) => setBulkStatusCategoryIds(ids.slice(0, 1))}
            singleSelect={true}
            label="Category filter (optional)"
            disabled={bulkUpdateStatus.isPending}
          />
        </div>

        {bulkFromStatus === bulkToStatus ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Current status and new status must be different.
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            color="var(--color-primary2)"
            onClick={onClose}
            disabled={bulkUpdateStatus.isPending}
            className="rounded-full px-4"
          >
            Cancel
          </Button>
          <Button
            color="var(--color-primary2)"
            onClick={() => void handleSubmit()}
            disabled={bulkUpdateStatus.isPending || bulkFromStatus === bulkToStatus}
            className="rounded-full px-5"
          >
            {bulkUpdateStatus.isPending ? "Updating..." : "Update statuses"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
