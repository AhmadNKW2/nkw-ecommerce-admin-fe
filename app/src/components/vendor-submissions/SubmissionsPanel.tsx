"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmationModal } from "@/components/common/DeleteConfirmationModal";
import { IconButton } from "@/components/ui/icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDeleteVendorSubmission,
  useRunSubmissionAi,
  useVendorSubmissions,
} from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type {
  VendorSubmission,
  VendorSubmissionStatus,
} from "@/services/vendor-submissions/types/vendor-submission.types";
import {
  SUBMISSION_STATUS_LABELS,
  submissionStatusVariant,
  type ProductSubmissionsTab,
} from "./submission-status";
import { ProductReviewModal } from "./ProductReviewModal";

const STATUS_FILTERS: { value: VendorSubmissionStatus | "all"; label: string }[] =
  [
    { value: "all", label: "All" },
    { value: "awaiting_brand", label: "Awaiting brand" },
    { value: "awaiting_category", label: "Awaiting category" },
    { value: "awaiting_category_specs", label: "Awaiting setup" },
    { value: "awaiting_specs_approval", label: "Awaiting specs" },
    { value: "ready", label: "Ready" },
    { value: "materialized", label: "Published" },
    { value: "failed", label: "Failed" },
  ];

type SubmissionsPanelProps = {
  onOpenTab?: (tab: ProductSubmissionsTab) => void;
};

export function SubmissionsPanel({ onOpenTab }: SubmissionsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<
    VendorSubmissionStatus | "all"
  >("all");
  const [reviewing, setReviewing] = useState<VendorSubmission | null>(null);
  const [submissionToDelete, setSubmissionToDelete] =
    useState<VendorSubmission | null>(null);

  const { data, isLoading, refetch } = useVendorSubmissions(
    {
      page: 1,
      limit: 50,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
  );
  const runAi = useRunSubmissionAi();
  const deleteSubmission = useDeleteVendorSubmission();
  const submissions = (data?.data ?? []) as VendorSubmission[];

  const handleDeleteConfirm = async () => {
    if (!submissionToDelete) return;
    try {
      await deleteSubmission.mutateAsync(submissionToDelete.id);
      setSubmissionToDelete(null);
      void refetch();
    } catch (error) {
      console.error("Failed to delete submission:", error);
    }
  };

  return (
    <>
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
              <TableHead className="w-72">Actions</TableHead>
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
                    <div
                      className="font-medium max-w-[240px] truncate"
                      title={submission.title}
                    >
                      {submission.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      Vendor #{submission.vendor_id} · {submission.price}
                      {submission.sale_price != null && (
                        <> (sale {submission.sale_price})</>
                      )}{" "}
                      · stock {submission.stock}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="max-w-[240px] truncate"
                      title={aiTitle || ""}
                    >
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
                    <Badge variant={submissionStatusVariant(submission.status)}>
                      {SUBMISSION_STATUS_LABELS[submission.status]}
                    </Badge>
                    {submission.error && (
                      <div
                        className="text-xs text-danger mt-1 max-w-[200px] truncate"
                        title={submission.error}
                      >
                        {submission.error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {submission.status === "awaiting_brand" && (
                        <Button
                          onClick={() => onOpenTab?.("brands")}
                          variant="outline"
                          className="h-10! px-3! text-sm!"
                        >
                          Review brand
                        </Button>
                      )}
                      {submission.status === "awaiting_category" && (
                        <Button
                          onClick={() => onOpenTab?.("categories")}
                          variant="outline"
                          className="h-10! px-3! text-sm!"
                        >
                          Review category
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
                      {submission.status === "awaiting_specs_approval" && (
                        <Button
                          onClick={() => onOpenTab?.("specs")}
                          variant="outline"
                          className="h-10! px-3! text-sm!"
                        >
                          Review specs
                        </Button>
                      )}
                      {submission.status === "ready" && (
                        <Button
                          onClick={() => setReviewing(submission)}
                          color="var(--color-primary)"
                          className="h-10! px-3! text-sm!"
                        >
                          Review & create
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
                      <IconButton
                        variant="delete"
                        title="Delete submission"
                        onClick={() => setSubmissionToDelete(submission)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <ProductReviewModal
        submission={reviewing}
        onClose={() => setReviewing(null)}
        onDone={() => refetch()}
      />

      <DeleteConfirmationModal
        isOpen={!!submissionToDelete}
        onClose={() => setSubmissionToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete submission?"
        message={
          submissionToDelete
            ? `This will permanently delete submission #${submissionToDelete.id} (“${submissionToDelete.title}”) and its related catalog requests. ${
                submissionToDelete.status === "materialized" &&
                submissionToDelete.product_id
                  ? "The already-created product will not be deleted."
                  : "This action cannot be undone."
              }`
            : undefined
        }
        confirmText="Delete"
        isPermanent
        isLoading={deleteSubmission.isPending}
      />
    </>
  );
}
