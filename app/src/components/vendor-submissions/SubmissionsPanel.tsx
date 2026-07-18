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
  useVendorSubmissions,
} from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type { VendorSubmission } from "@/services/vendor-submissions/types/vendor-submission.types";
import {
  SUBMISSION_STATUS_LABELS,
  submissionStatusVariant,
} from "./submission-status";
import { SubmissionReviewWorkspaceModal } from "./SubmissionReviewWorkspaceModal";

export function SubmissionsPanel() {
  const [reviewing, setReviewing] = useState<VendorSubmission | null>(null);
  const [submissionToDelete, setSubmissionToDelete] =
    useState<VendorSubmission | null>(null);

  const { data, isLoading, refetch } = useVendorSubmissions({
    page: 1,
    limit: 50,
  });
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
      {isLoading ? (
        <Card>
          <p className="text-gray-500">Loading...</p>
        </Card>
      ) : submissions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Boxes />}
            title="No submissions"
            description="No vendor product submissions yet."
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
              <TableHead className="w-56">Actions</TableHead>
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
                      {submission.status === "materialized" &&
                      submission.product_id ? (
                        <Button
                          href={`/products/${submission.product_id}`}
                          variant="outline"
                          className="h-10! px-3! text-sm!"
                        >
                          Open product
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setReviewing(submission)}
                          color="var(--color-primary)"
                          className="h-10! px-3! text-sm!"
                        >
                          Review
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

      <SubmissionReviewWorkspaceModal
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
