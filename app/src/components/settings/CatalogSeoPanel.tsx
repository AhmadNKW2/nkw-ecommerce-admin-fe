"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Toggle } from "../ui/toggle";
import {
  useGenerateSeo,
  useMissingSeo,
} from "../../services/settings/hooks/use-settings";
import { settingsService } from "../../services/settings/api/settings.service";
import type {
  SeoEntityType,
  SeoGenerateJobStatus,
  SeoListStatus,
  SeoMissingCounts,
} from "../../services/settings/types/settings.types";
import { showErrorToast, showSuccessToast } from "../../lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";

const ENTITY_TABS: Array<{ type: SeoEntityType; label: string }> = [
  { type: "product", label: "Products" },
  { type: "category", label: "Categories" },
  { type: "brand", label: "Brands" },
  { type: "vendor", label: "Vendors" },
];

const SEO_STATUS_OPTIONS: Array<{ value: SeoListStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "missing", label: "Missing SEO" },
  { value: "complete", label: "Not missing (complete)" },
];

const EMPTY_COUNTS: SeoMissingCounts = {
  product: 0,
  category: 0,
  brand: 0,
  vendor: 0,
};

export function CatalogSeoPanel() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<SeoEntityType>("product");
  const [seoStatus, setSeoStatus] = useState<SeoListStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllMissing, setSelectAllMissing] = useState(false);
  const [searchInternet, setSearchInternet] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<SeoGenerateJobStatus | null>(null);

  const isUnpaginatedType =
    activeType === "category" ||
    activeType === "brand" ||
    activeType === "vendor";
  const limit = isUnpaginatedType ? 5000 : 25;
  const requestPage = isUnpaginatedType ? 1 : page;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSelectedIds([]);
    setSelectAllMissing(false);
    setPage(1);
  }, [activeType, seoStatus]);

  const catalogQuery = useMissingSeo({
    type: activeType,
    seo_status: seoStatus,
    q: debouncedSearch || undefined,
    page: requestPage,
    limit,
  });

  const generateSeo = useGenerateSeo();

  const items = catalogQuery.data?.data ?? [];
  const meta = catalogQuery.data?.meta;
  const counts = meta?.counts ?? EMPTY_COUNTS;
  const listTotal = meta?.total ?? 0;
  const totalMissingForType = counts[activeType] ?? 0;
  const totalPages = meta?.totalPages ?? 0;

  const pageIds = useMemo(() => items.map((item) => item.id), [items]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await settingsService.getSeoGenerateJobStatus(jobId);
        if (cancelled) {
          return;
        }

        const status = response.data;
        setJobStatus(status);

        if (status.status === "running") {
          return;
        }

        setJobId(null);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.settings.all,
        });

        if (status.status === "done") {
          const updated = status.result?.updated ?? 0;
          const failed = status.result?.failed ?? 0;
          const skipped = status.result?.skipped ?? 0;
          showSuccessToast(
            `SEO generation finished: ${updated} updated, ${skipped} skipped, ${failed} failed`,
          );
          setSelectedIds([]);
          setSelectAllMissing(false);
          return;
        }

        showErrorToast(status.error || "SEO generation failed");
      } catch (error) {
        if (!cancelled) {
          showErrorToast(
            error instanceof Error
              ? error.message
              : "Failed to poll SEO job status",
          );
          setJobId(null);
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [jobId, queryClient]);

  const togglePageSelection = (checked: boolean) => {
    setSelectAllMissing(false);
    if (checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
  };

  const toggleRow = (id: number, checked: boolean) => {
    setSelectAllMissing(false);
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((value) => value !== id),
    );
  };

  const handleGenerate = async () => {
    if (!selectAllMissing && selectedIds.length === 0) {
      showErrorToast("Select at least one item, or choose Select all missing");
      return;
    }

    try {
      const response = await generateSeo.mutateAsync({
        type: activeType,
        ids: selectAllMissing ? "all_missing" : selectedIds,
        search_internet: searchInternet,
        overwrite,
      });
      setJobId(response.data.job_id);
      setJobStatus({
        job_id: response.data.job_id,
        type: "seo-generate",
        status: "running",
        started_at: new Date().toISOString(),
        finished_at: null,
        progress: 0,
        total: selectAllMissing ? totalMissingForType : selectedIds.length,
        current_index: 0,
        current_item: null,
        duration_seconds: 0,
        result: null,
        error: null,
      });
      showSuccessToast("SEO generation started");
    } catch {
      // toast handled by mutation
    }
  };

  const isGenerating = Boolean(jobId) || generateSeo.isPending;
  const selectedCount = selectAllMissing
    ? totalMissingForType
    : selectedIds.length;

  const emptyMessage =
    seoStatus === "missing"
      ? "No items missing SEO for this filter."
      : seoStatus === "complete"
        ? "No items with complete SEO for this filter."
        : "No catalog items for this filter.";

  return (
    <Card>
      <h2 className="text-lg font-semibold">Catalog SEO</h2>
      <p className="mt-1 text-sm text-gray-500">
        Browse all products, categories, brands, and vendors. Filter by missing
        or complete SEO, then generate with AI. Internet search is optional and
        costs more.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ENTITY_TABS.map((tab) => {
          const count = counts[tab.type] ?? 0;
          const isActive = activeType === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveType(tab.type)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                isActive
                  ? "border-secondary bg-secondary/10"
                  : "border-gray-200 bg-white hover:border-secondary/40"
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{tab.label}</p>
              <p className="mt-1 text-xs text-gray-500">
                Missing SEO: <span className="font-semibold">{count}</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end">
          <div className="w-full max-w-xs">
            <Select
              label="SEO status"
              value={seoStatus}
              onChange={(value) =>
                setSeoStatus((Array.isArray(value) ? value[0] : value) as SeoListStatus)
              }
              options={SEO_STATUS_OPTIONS}
              search={false}
            />
          </div>
          <div className="w-full max-w-md">
            <Input
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, slug, or SKU"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Checkbox
            checked={selectAllMissing}
            onChange={(checked) => {
              setSelectAllMissing(checked);
              if (checked) {
                setSelectedIds([]);
              }
            }}
            label={`Select all missing (${totalMissingForType})`}
            disabled={isGenerating || totalMissingForType === 0}
          />
          <div className="flex items-center gap-2">
            <Toggle
              checked={searchInternet}
              onChange={setSearchInternet}
              disabled={isGenerating}
            />
            <div>
              <p className="text-sm font-medium">Search internet</p>
              <p className="text-xs text-gray-500">
                Off = catalog facts only. On = research mode (name-only payload +
                required web search; slower, higher cost).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Toggle
              checked={overwrite}
              onChange={setOverwrite}
              disabled={isGenerating}
            />
            <div>
              <p className="text-sm font-medium">Overwrite existing</p>
              <p className="text-xs text-gray-500">
                Replace meta even if already filled.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating || selectedCount === 0}
          >
            {isGenerating
              ? "Generating…"
              : `Generate SEO (${selectedCount})`}
          </Button>
        </div>
      </div>

      {jobStatus && (
        <div className="mt-4 rounded-lg border border-secondary/20 bg-secondary/5 px-4 py-3 text-sm">
          <p className="font-medium">
            Job {jobStatus.status}
            {jobStatus.total != null
              ? ` — ${jobStatus.progress ?? 0}/${jobStatus.total}`
              : ""}
          </p>
          {jobStatus.current_item ? (
            <p className="mt-1 text-gray-600">Current: {jobStatus.current_item}</p>
          ) : null}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">
                <Checkbox
                  checked={allPageSelected}
                  onChange={togglePageSelection}
                  disabled={isGenerating || pageIds.length === 0 || selectAllMissing}
                />
              </th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">SEO status</th>
              <th className="px-3 py-2 font-medium">Missing fields</th>
            </tr>
          </thead>
          <tbody>
            {catalogQuery.isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  Loading catalog SEO items…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const checked =
                  selectAllMissing || selectedIds.includes(item.id);
                const isComplete = item.missing_fields.length === 0;
                return (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={checked}
                        onChange={(value) => toggleRow(item.id, value)}
                        disabled={isGenerating || selectAllMissing}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{item.name_en}</p>
                      <p className="text-xs text-gray-500" dir="rtl">
                        {item.name_ar}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{item.slug || "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          isComplete
                            ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                            : "inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                        }
                      >
                        {isComplete ? "Complete" : "Missing"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {isComplete ? "—" : item.missing_fields.join(", ")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <p>
          {listTotal} item{listTotal === 1 ? "" : "s"}
          {!isUnpaginatedType && totalPages > 0
            ? ` · Page ${page} of ${totalPages}`
            : ""}
        </p>
        {!isUnpaginatedType ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1 || isGenerating}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages || isGenerating}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Showing all results</p>
        )}
      </div>
    </Card>
  );
}
