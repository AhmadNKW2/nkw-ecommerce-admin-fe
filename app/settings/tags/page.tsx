"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { CategoryTreeSelect } from "../../src/components/products/CategoryTreeSelect";
import { useCategories } from "../../src/services/categories/hooks/use-categories";
import {
  useCategoryTagsJobStatus,
  useGenerateCategoryTags,
} from "../../src/services/tags/hooks/use-tags";

export default function TagsSettingsPage() {
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  const generateCategoryTags = useGenerateCategoryTags();
  const { data: jobStatus, isFetching: isPollingJobStatus } =
    useCategoryTagsJobStatus(jobId);

  const handleGenerate = async () => {
    const categoryIds = selectedCategoryIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    const response = await generateCategoryTags.mutateAsync({
      category_ids: categoryIds.length > 0 ? categoryIds : undefined,
    });

    setJobId(response.data.job_id);
  };

  const statusBadgeClass =
    jobStatus?.status === "done"
      ? "bg-success/15 text-success"
      : jobStatus?.status === "failed"
        ? "bg-danger/15 text-danger"
        : "bg-primary/15 text-primary";

  return (
    <div className="admin-page">
      <SettingsNav />

      <PageHeader
        icon={<Sparkles />}
        title="Category Tags"
        description="Generate bilingual search tags from category and product names using AI."
        action={{
          label: generateCategoryTags.isPending ? "Starting..." : "Create Tags",
          onClick: handleGenerate,
          disabled: generateCategoryTags.isPending,
        }}
      />

      <Card>
        <h2 className="text-lg font-semibold">Generation Filters</h2>
        <p className="mt-1 text-sm text-gray-500">
          Leave category selection empty to generate tags for all active leaf categories.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <CategoryTreeSelect
            label="Categories (optional)"
            categories={categories}
            selectedIds={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            disabled={isCategoriesLoading || generateCategoryTags.isPending}
          />
        </div>
      </Card>

      {jobStatus ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Generation Job</h2>
              <p className="mt-1 text-sm text-gray-500">
                Job ID: {jobStatus.job_id}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>
              {jobStatus.status.toUpperCase()}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              Progress: {jobStatus.progress} / {jobStatus.total}
            </p>
            {jobStatus.current_category_name_en ? (
              <p>Current category: {jobStatus.current_category_name_en}</p>
            ) : null}
            {isPollingJobStatus && jobStatus.status === "running" ? (
              <p className="text-gray-500">Refreshing status...</p>
            ) : null}
            {jobStatus.error ? <p className="text-danger">{jobStatus.error}</p> : null}
          </div>

          {jobStatus.result ? (
            <div className="mt-5 rounded-r1 border border-primary/20 bg-primary/5 p-4 text-sm">
              <p>Processed categories: {jobStatus.result.processed_categories}</p>
              <p>Updated categories: {jobStatus.result.updated_categories}</p>
              <p>Failed categories: {jobStatus.result.failed_categories}</p>
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setJobId(null)}
              disabled={jobStatus.status === "running"}
            >
              Clear Job View
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
