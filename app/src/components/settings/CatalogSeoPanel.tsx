"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Toggle } from "../ui/toggle";
import {
  useGenerateSeo,
  useMissingSeo,
} from "../../services/settings/hooks/use-settings";
import { settingsService } from "../../services/settings/api/settings.service";
import type {
  SeoEntityType,
  SeoGenerateJobStatus,
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

const EMPTY_COUNTS: SeoMissingCounts = {
  product: 0,
  category: 0,
  brand: 0,
  vendor: 0,
};

export function CatalogSeoPanel() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<SeoEntityType>("product");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAllMissing, setSelectAllMissing] = useState(false);
  const [searchInternet, setSearchInternet] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<SeoGenerateJobStatus | null>(null);

  const limit = 25;

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
  }, [activeType]);

  const missingQuery = useMissingSeo({
    type: activeType,
    q: debouncedSearch || undefined,
    page,
    limit,
  });

  const generateSeo = useGenerateSeo();

  const items = missingQuery.data?.data ?? [];
  const meta = missingQuery.data?.meta;
  const counts = meta?.counts ?? EMPTY_COUNTS;
  const totalMissingForType = meta?.total ?? counts[activeType] ?? 0;
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

  return (
    <Card>
      <h2 className="text-lg font-semibold">Catalog SEO</h2>
      <p className="mt-1 text-sm text-gray-500">
        Review items missing SEO meta, select what you want, then generate with AI.
        Internet search is optional and costs more.
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
        <div className="w-full max-w-md">
          <Input
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, slug, or SKU"
          />
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
                Off = catalog only (cheaper). On = web research (3–10x cost).
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
              <th className="px-3 py-2 font-medium">Missing fields</th>
            </tr>
          </thead>
          <tbody>
            {missingQuery.isLoading ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                  Loading missing SEO items…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                  No missing SEO items for this filter.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const checked =
                  selectAllMissing || selectedIds.includes(item.id);
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
                    <td className="px-3 py-2 text-gray-600">
                      {item.missing_fields.join(", ")}
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
          Page {page}
          {totalPages > 0 ? ` of ${totalPages}` : ""}
        </p>
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
      </div>
    </Card>
  );
}
