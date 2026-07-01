"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { CategoryTreeSelect } from "@/components/products/CategoryTreeSelect";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useJobTracker } from "@/providers/job-tracker-provider";
import { useCategories } from "@/services/categories/hooks/use-categories";
import { useBulkReviewReimportAi } from "@/services/products/hooks/use-products";
import { BulkReviewReimportAiDto } from "@/services/products/types/product.types";
import { useVendors } from "@/services/vendors/hooks/use-vendors";
import { useResolvedFeatureToggles } from "@/hooks/use-resolved-feature-toggles";

const BULK_REIMPORT_LOADING_MESSAGE = "Re-importing review products with AI...";
const LEGACY_BULK_REIMPORT_LOADING_MESSAGE =
  "Re-importing the filtered review queue with AI...";

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getDisplayText = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }
  return null;
};

const getImportJobId = (payload: unknown) => {
  const record = asRecord(payload);
  return getDisplayText(record?.job_id, record?.jobId, record?.id);
};

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const record = asRecord(error);
  const message = getDisplayText(record?.message);
  return message ?? fallback;
};

function ImportJobCards({
  jobs,
  showJobId = false,
  emptyMessage,
}: {
  jobs: ReturnType<typeof useJobTracker>["activeJobs"];
  showJobId?: boolean;
  emptyMessage?: string;
}) {
  if (jobs.length === 0) {
    return emptyMessage ? (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-500">
        {emptyMessage}
      </div>
    ) : null;
  }

  return (
    <>
      {jobs.map((job) => {
        const completedCount = job.progress || 0;
        const currentIndex = job.currentIndex || 0;
        const percentage =
          job.total && job.total > 0 ? Math.round((completedCount / job.total) * 100) : undefined;

        return (
          <div
            key={job.jobId}
            className="flex w-full flex-col gap-1.5 rounded-[18px] border border-blue-200/70 bg-white/70 px-4 py-3"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-blue-900">{job.loadingMessage}</div>
                  {showJobId ? (
                    <div className="text-xs text-blue-700/80">Job ID: {job.jobId}</div>
                  ) : null}
                </div>
              </div>
              {percentage !== undefined ? (
                <span className="text-xs font-semibold text-blue-800">
                  {percentage}% finished
                  {job.total && currentIndex > 0
                    ? ` (product ${currentIndex} of ${job.total})`
                    : ` (${completedCount} / ${job.total})`}
                </span>
              ) : (
                <span className="text-xs font-semibold text-blue-700">
                  Waiting for backend progress...
                </span>
              )}
            </div>
            {percentage !== undefined ? (
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function ProductImportTools({ showBanner = true }: { showBanner?: boolean }) {
  const { activeJobs, addJob } = useJobTracker();
  const { isEnabled } = useResolvedFeatureToggles();
  const vendorsEnabled = isEnabled("vendors_enabled");
  const bulkReviewReimport = useBulkReviewReimportAi();
  const { data: vendorsData } = useVendors();
  const categoriesData = useCategories();
  const isMountedRef = useRef(true);
  const [isBulkReimporting, setIsBulkReimporting] = useState(false);
  const [bulkReimportModalOpen, setBulkReimportModalOpen] = useState(false);
  const [importStatusModalOpen, setImportStatusModalOpen] = useState(false);
  const [bulkReimportVendorId, setBulkReimportVendorId] = useState("");
  const [bulkReimportCategoryIds, setBulkReimportCategoryIds] = useState<string[]>([]);

  const importJobs = useMemo(
    () => activeJobs.filter((job) => job.type === "import"),
    [activeJobs]
  );
  const activeBulkJob = importJobs.find(
    (job) =>
      job.loadingMessage === BULK_REIMPORT_LOADING_MESSAGE ||
      job.loadingMessage === LEGACY_BULK_REIMPORT_LOADING_MESSAGE
  );
  const computedIsBulkReimporting = isBulkReimporting || !!activeBulkJob;

  const vendorOptions = useMemo(
    () =>
      (vendorsData?.data ?? []).map((vendor) => ({
        value: String(vendor.id),
        label: vendor.name_en || vendor.name_ar || `Vendor #${vendor.id}`,
      })),
    [vendorsData?.data]
  );

  const bulkReimportScopeMessage =
    (vendorsEnabled && bulkReimportVendorId) || bulkReimportCategoryIds.length > 0
      ? "Only review products matching the optional filters below will be re-imported. Leave either field empty to keep it unrestricted."
      : "All review products will be re-imported. Choose a vendor, a category, or both if you want to narrow the run.";

  const bulkReimportActionLabel = computedIsBulkReimporting
    ? "Starting re-import..."
    : (vendorsEnabled && bulkReimportVendorId) || bulkReimportCategoryIds.length > 0
      ? "Re-import selected review products"
      : "Re-import all review products";

  const handleBulkReimport = async () => {
    if (computedIsBulkReimporting) {
      return;
    }

    setIsBulkReimporting(true);

    try {
      const payload: BulkReviewReimportAiDto = {};
      const parsedVendorId = Number(bulkReimportVendorId);
      const parsedCategoryId = Number(bulkReimportCategoryIds[0] ?? "");

      if (Number.isInteger(parsedVendorId) && parsedVendorId > 0) {
        payload.vendor_id = parsedVendorId;
      }
      if (Number.isInteger(parsedCategoryId) && parsedCategoryId > 0) {
        payload.category_id = parsedCategoryId;
      }

      const response = await bulkReviewReimport.mutateAsync(payload);
      const jobId = getImportJobId(response.data);

      if (!jobId) {
        showErrorToast("Bulk review re-import started, but no job id was returned.");
        return;
      }

      addJob({
        type: "import",
        jobId,
        loadingMessage: BULK_REIMPORT_LOADING_MESSAGE,
        successFallback: "Bulk review re-import finished.",
        failureFallback: "Bulk review re-import failed.",
      });
      showSuccessToast(
        payload.vendor_id || payload.category_id
          ? "Bulk review re-import started for the selected filters."
          : "Bulk review re-import started for all review products."
      );
      setBulkReimportModalOpen(false);
    } catch (bulkError) {
      showErrorToast(
        getActionErrorMessage(bulkError, "Failed to start the bulk review re-import.")
      );
    } finally {
      if (isMountedRef.current) {
        setIsBulkReimporting(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {showBanner && importJobs.length > 0 ? (
        <section className="flex flex-col gap-2 overflow-hidden rounded-[20px] border border-blue-200 bg-blue-50 px-6 py-4 shadow-sm">
          <ImportJobCards jobs={importJobs} />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          color="var(--color-primary2)"
          onClick={() => setBulkReimportModalOpen(true)}
          disabled={computedIsBulkReimporting}
          className="rounded-full px-4"
        >
          {computedIsBulkReimporting ? "Re-importing reviews" : "Bulk re-import reviews"}
        </Button>
        <Button
          variant="outline"
          color="var(--color-primary2)"
          onClick={() => setImportStatusModalOpen(true)}
          className="rounded-full px-4"
        >
          View import status
        </Button>
      </div>

      <Modal
        isOpen={bulkReimportModalOpen}
        onClose={() => {
          if (!isBulkReimporting) {
            setBulkReimportModalOpen(false);
          }
        }}
        className="self-start w-full max-w-3xl"
      >
        <div className="flex flex-col gap-6">
          <div className="space-y-3 pr-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Bulk re-import review products
            </h2>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {bulkReimportScopeMessage}
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
                label="Vendor filter"
                value={bulkReimportVendorId}
                onChange={(value) =>
                  setBulkReimportVendorId(Array.isArray(value) ? value[0] ?? "" : value)
                }
                options={vendorOptions}
                search={vendorOptions.length > 6}
                multiple={false}
                placeholder="All vendors"
                disabled={computedIsBulkReimporting || vendorOptions.length === 0}
              />
            ) : null}
            <CategoryTreeSelect
              categories={categoriesData.data ?? []}
              selectedIds={bulkReimportCategoryIds}
              onChange={(ids) => setBulkReimportCategoryIds(ids.slice(0, 1))}
              singleSelect={true}
              label="Category filter"
              disabled={computedIsBulkReimporting || (categoriesData.data ?? []).length === 0}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              color="var(--color-primary2)"
              onClick={() => setBulkReimportModalOpen(false)}
              disabled={isBulkReimporting}
              className="rounded-full px-4"
            >
              Cancel
            </Button>
            <Button
              color="var(--color-primary2)"
              onClick={() => void handleBulkReimport()}
              disabled={computedIsBulkReimporting}
              className="rounded-full px-5"
            >
              {bulkReimportActionLabel}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={importStatusModalOpen}
        onClose={() => setImportStatusModalOpen(false)}
        className="self-start w-full max-w-4xl"
      >
        <div className="flex flex-col gap-6">
          <div className="space-y-2 pr-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              View import status
            </h2>
            <p className="text-sm leading-7 text-slate-600">
              Tracked import jobs from this browser continue updating here after refresh or
              re-login while the backend job is still running.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 md:p-5">
            <ImportJobCards
              jobs={importJobs}
              showJobId
              emptyMessage="No import jobs are currently being tracked in this browser."
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              color="var(--color-primary2)"
              onClick={() => setImportStatusModalOpen(false)}
              className="rounded-full px-5"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
