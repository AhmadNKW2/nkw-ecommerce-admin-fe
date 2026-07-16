"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { Badge } from "../src/components/ui/badge";
import { EmptyState } from "../src/components/common/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import {
  useMaterializeSubmission,
  useRunSubmissionAi,
  useVendorSubmissions,
} from "../src/services/vendor-submissions/hooks/use-vendor-submissions";
import type {
  VendorSubmission,
  VendorSubmissionStatus,
} from "../src/services/vendor-submissions/types/vendor-submission.types";

const STATUS_LABELS: Record<VendorSubmissionStatus, string> = {
  pending_ai: "Queued for AI",
  ai_processing: "AI processing",
  awaiting_brand: "Awaiting brand",
  awaiting_category: "Awaiting category",
  awaiting_category_specs: "Awaiting category setup",
  ready: "Ready",
  materialized: "Published",
  rejected: "Rejected",
  failed: "Failed",
};

const STATUS_FILTERS: { value: VendorSubmissionStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "awaiting_brand", label: "Awaiting brand" },
  { value: "awaiting_category", label: "Awaiting category" },
  { value: "awaiting_category_specs", label: "Awaiting setup" },
  { value: "ready", label: "Ready" },
  { value: "materialized", label: "Published" },
  { value: "failed", label: "Failed" },
];

function statusVariant(status: VendorSubmissionStatus) {
  switch (status) {
    case "materialized":
    case "ready":
      return "success" as const;
    case "rejected":
    case "failed":
      return "danger" as const;
    case "ai_processing":
    case "pending_ai":
      return "default" as const;
    default:
      return "warning" as const;
  }
}

export default function ProductSubmissionsPage() {
  const [statusFilter, setStatusFilter] = useState<VendorSubmissionStatus | "all">(
    "all",
  );

  const { data, isLoading, refetch } = useVendorSubmissions(
    {
      page: 1,
      limit: 50,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { refetchInterval: 15000 },
  );

  const runAi = useRunSubmissionAi();
  const materialize = useMaterializeSubmission();

  const submissions = (data?.data ?? []) as VendorSubmission[];

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Boxes />}
        title="AI Submissions"
        description="Vendor product submissions enriched by AI. Approve category and brand requests, then create the product."
      />

      <Card>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 h-10 rounded-r1 border transition-all ${
                statusFilter === filter.value
                  ? "bg-secondary text-white border-secondary"
                  : "border-secondary/40 text-gray-600 hover:bg-secondary/10"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <p className="text-gray-500">Loading...</p>
        </Card>
      ) : submissions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Boxes />}
            title="No submissions"
            description="No vendor submissions match this filter."
          />
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Submitted title</TableHead>
              <TableHead>AI name (EN)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-64">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => {
              const aiTitle = submission.ai_result?.stage2?.title_en;
              return (
                <TableRow key={submission.id}>
                  <TableCell className="font-mono text-sm text-gray-500">
                    #{submission.id}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-[240px] truncate" title={submission.title}>
                      {submission.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      Vendor #{submission.vendor_id} · {submission.price} · stock{" "}
                      {submission.stock}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[240px] truncate" title={aiTitle || ""}>
                      {aiTitle || <span className="text-gray-400">—</span>}
                    </div>
                    {submission.ai_result?.stage2?.title_ar && (
                      <div
                        className="text-xs text-gray-500 max-w-[240px] truncate"
                        dir="rtl"
                      >
                        {submission.ai_result.stage2.title_ar}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(submission.status)}>
                      {STATUS_LABELS[submission.status]}
                    </Badge>
                    {submission.error && (
                      <div className="text-xs text-danger mt-1 max-w-[200px] truncate" title={submission.error}>
                        {submission.error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(submission.brand_request_id ||
                        submission.category_request_id) && (
                        <Button
                          href="/catalog-requests"
                          variant="outline"
                          className="h-10! px-3! text-sm!"
                        >
                          View requests
                        </Button>
                      )}
                      {submission.status === "awaiting_category_specs" && (
                        <Button
                          onClick={() => runAi.mutate(submission.id)}
                          disabled={runAi.isPending}
                          color="var(--color-primary)"
                          className="h-10! px-3! text-sm!"
                        >
                          Run AI mapping
                        </Button>
                      )}
                      {submission.status === "ready" && (
                        <Button
                          onClick={() =>
                            materialize.mutate(submission.id, {
                              onSuccess: () => refetch(),
                            })
                          }
                          disabled={materialize.isPending}
                          color="var(--color-primary)"
                          className="h-10! px-3! text-sm!"
                        >
                          Create product
                        </Button>
                      )}
                      {submission.status === "materialized" &&
                        submission.product_id && (
                          <Button
                            href={`/products/${submission.product_id}`}
                            variant="outline"
                            className="h-10! px-3! text-sm!"
                          >
                            Open product
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
