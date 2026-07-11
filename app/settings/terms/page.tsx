"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { CategoryTreeSelect } from "../../src/components/products/CategoryTreeSelect";
import { useCategories } from "../../src/services/categories/hooks/use-categories";
import {
  useCancelTermsJob,
  useClearAllConcepts,
  useGenerateTerms,
  usePauseTermsJob,
  useResumeTermsJob,
  useTermsJobStatus,
} from "../../src/services/terms/hooks/use-terms";
import { TermsJobStatusResponse } from "../../src/services/terms/types/term.types";
import { queryKeys } from "../../src/lib/query-keys";

export default function TermsSettingsPage() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();

  const generateTerms = useGenerateTerms();
  const cancelTermsJob = useCancelTermsJob();
  const clearAllConcepts = useClearAllConcepts();
  const pauseTermsJob = usePauseTermsJob();
  const resumeTermsJob = useResumeTermsJob();
  const { data: initialJobStatus, error: initialJobStatusError } =
    useTermsJobStatus(jobId);
  const [jobStatus, setJobStatus] = useState<TermsJobStatusResponse | null>(null);

  useEffect(() => {
    const storedJobId = window.localStorage.getItem("terms-job-id");
    if (storedJobId) {
      setJobId(storedJobId);
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      window.localStorage.setItem("terms-job-id", jobId);
    } else {
      window.localStorage.removeItem("terms-job-id");
      setJobStatus(null);
    }
  }, [jobId]);

  useEffect(() => {
    if (initialJobStatus) {
      setJobStatus(initialJobStatus);
    }
  }, [initialJobStatus]);

  useEffect(() => {
    if (!jobId || !initialJobStatusError) {
      return;
    }
    const status = (initialJobStatusError as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      setJobId(null);
    }
  }, [initialJobStatusError, jobId]);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const eventSource = new EventSource(`/api/terms/jobs/${jobId}/stream`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const status = (parsed?.data ?? parsed) as TermsJobStatusResponse;
        setJobStatus(status);
        if (
          status?.status &&
          status.status !== "running" &&
          status.status !== "paused"
        ) {
          queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
          eventSource.close();
        }
      } catch {
        // ignore malformed SSE payloads
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (jobStatus?.status !== "done" && jobStatus?.status !== "cancelled") {
        setJobId(null);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, queryClient]);

  useEffect(() => {
    if (!jobStatus || jobStatus.status !== "running") {
      return;
    }
    const timer = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
    }, 2000);
    return () => {
      window.clearInterval(timer);
    };
  }, [jobStatus?.status, queryClient]);

  const handleGenerate = async () => {
    const categoryIds = selectedCategoryIds
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
    const response = await generateTerms.mutateAsync({
      category_ids: categoryIds.length > 0 ? categoryIds : undefined,
    });
    setJobId(response.data.job_id);
  };

  const statusBadgeClass =
    jobStatus?.status === "done"
      ? "bg-success/15 text-success"
      : jobStatus?.status === "paused"
        ? "bg-warning/20 text-warning"
        : jobStatus?.status === "failed"
          ? "bg-danger/15 text-danger"
          : jobStatus?.status === "cancelled"
            ? "bg-warning/20 text-warning"
            : "bg-primary/15 text-primary";

  const progressPercent = useMemo(() => {
    if (!jobStatus || jobStatus.total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((jobStatus.progress / jobStatus.total) * 100));
  }, [jobStatus]);

  const handleStopJob = async () => {
    if (!jobId) {
      return;
    }
    const response = await cancelTermsJob.mutateAsync(jobId);
    setJobStatus((current) =>
      current
        ? {
            ...current,
            status: response.data.status,
            finished_at: new Date().toISOString(),
          }
        : current,
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.terms.all });
  };

  const handlePauseResumeJob = async () => {
    if (!jobId || !jobStatus) {
      return;
    }
    if (jobStatus.status === "running") {
      await pauseTermsJob.mutateAsync(jobId);
      return;
    }
    if (jobStatus.status === "paused") {
      await resumeTermsJob.mutateAsync(jobId);
    }
  };

  const shouldShowCurrentJob = !!jobId && !!jobStatus;
  const canStopJob = jobStatus?.status === "running" || jobStatus?.status === "paused";
  const canPauseResumeJob = jobStatus?.status === "running" || jobStatus?.status === "paused";
  const updatedRows = jobStatus?.result?.updated ?? [];

  return (
    <div className="admin-page">
      <SettingsNav />

      <PageHeader
        icon={<Sparkles />}
        title="Search Concepts"
        description="Generate global concept groups from product titles. View and edit concepts on the Concepts page."
        action={{
          label: generateTerms.isPending ? "Starting..." : "Generate Concepts",
          onClick: handleGenerate,
          disabled: generateTerms.isPending || canStopJob,
        }}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Generation</h2>
          <Button
            variant="outline"
            color="#dc2626"
            onClick={() => clearAllConcepts.mutateAsync()}
            disabled={clearAllConcepts.isPending || canStopJob}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            {clearAllConcepts.isPending ? "Removing..." : "Remove All Concepts"}
          </Button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Optionally filter by categories. This filter only limits which products are
          analyzed and is not stored in concept groups.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4">
          <CategoryTreeSelect
            label="Categories (optional)"
            categories={categories}
            selectedIds={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            disabled={isCategoriesLoading || generateTerms.isPending || canStopJob}
          />
          <p className="text-xs text-gray-500">
            Selected categories: {selectedCategoryIds.length}
          </p>
        </div>
      </Card>

      {shouldShowCurrentJob ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Current Generation Job</h2>
              <p className="mt-1 text-sm text-gray-500">Job ID: {jobStatus.job_id}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>
              {jobStatus.status.toUpperCase()}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              Progress: {jobStatus.progress} / {jobStatus.total}
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{progressPercent}% completed</p>
            {jobStatus.current_concept_label_en ? (
              <p>Current concept: {jobStatus.current_concept_label_en}</p>
            ) : null}
            {jobStatus.error ? <p className="text-danger">{jobStatus.error}</p> : null}
          </div>

          {jobStatus.result ? (
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-r1 border border-primary/20 bg-primary/5 p-4">
                <p>Processed titles: {jobStatus.result.processed_products}</p>
                <p>Detected concepts: {jobStatus.result.detected_concepts}</p>
                <p>Updated groups: {jobStatus.result.updated_groups}</p>
                <p>Failed concepts: {jobStatus.result.failed_concepts}</p>
              </div>

              {updatedRows.length > 0 ? (
                <div className="overflow-hidden rounded-r1 border border-gray-200">
                  <div className="grid grid-cols-4 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>Concept Key</span>
                    <span>Concept Label</span>
                    <span>Terms EN</span>
                    <span>Terms AR</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {updatedRows.slice(0, 50).map((row) => (
                      <div
                        key={row.concept_key}
                        className="grid grid-cols-4 px-4 py-2 text-sm text-gray-700"
                      >
                        <span>{row.concept_key}</span>
                        <span>{row.concept_label_en || row.concept_label_ar || "-"}</span>
                        <span>{row.terms_en_count}</span>
                        <span>{row.terms_ar_count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handlePauseResumeJob}
              disabled={
                !canPauseResumeJob ||
                pauseTermsJob.isPending ||
                resumeTermsJob.isPending
              }
            >
              {jobStatus?.status === "paused"
                ? resumeTermsJob.isPending
                  ? "Starting..."
                  : "Start"
                : pauseTermsJob.isPending
                  ? "Pausing..."
                  : "Pause"}
            </Button>
            <Button
              variant="outline"
              onClick={handleStopJob}
              disabled={!canStopJob || cancelTermsJob.isPending}
              color="#dc2626"
            >
              {cancelTermsJob.isPending ? "Stopping..." : "Stop Job"}
            </Button>
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
