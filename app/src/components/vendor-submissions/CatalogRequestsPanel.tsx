"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCatalogRequests,
  useRejectCatalogRequest,
} from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type {
  CatalogRequest,
  CatalogRequestType,
} from "@/services/vendor-submissions/types/vendor-submission.types";
import { CheckCircle2 } from "lucide-react";
import { BrandRequestReviewModal } from "./BrandRequestReviewModal";
import { CategoryRequestReviewModal } from "./CategoryRequestReviewModal";
import { SpecsRequestReviewModal } from "./SpecsRequestReviewModal";

type CatalogRequestsPanelProps = {
  type: CatalogRequestType;
};

export function CatalogRequestsPanel({ type }: CatalogRequestsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const [reviewing, setReviewing] = useState<CatalogRequest | null>(null);

  const { data, isLoading, refetch } = useCatalogRequests(
    {
      page: 1,
      limit: 50,
      type,
      status: statusFilter === "all" ? undefined : "pending",
    },
  );
  const reject = useRejectCatalogRequest();
  const requests = (data?.data ?? []) as CatalogRequest[];

  return (
    <>
      <Card>
        <div className="flex flex-wrap gap-2">
          {(["pending", "all"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 h-10 rounded-r1 border transition-all ${
                statusFilter === filter
                  ? "bg-primary text-white border-primary"
                  : "border-primary/30 text-gray-600 hover:bg-primary/10"
              }`}
            >
              {filter === "pending" ? "Pending" : "All"}
            </button>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <p className="text-gray-500">Loading...</p>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 />}
            title="No requests"
            description={`No ${type} requests match this filter.`}
          />
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Suggestion</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-56">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-sm text-gray-500">
                  #{request.id}
                </TableCell>
                <TableCell>
                  {type === "specs" ? (
                    <div className="font-medium">
                      {String(request.payload?.title_en ?? "Mapped values")}
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">
                        {request.payload?.name_en || "—"}
                      </div>
                      <div className="text-sm text-gray-500" dir="rtl">
                        {request.payload?.name_ar}
                      </div>
                    </>
                  )}
                  {request.payload?.mode && (
                    <div className="text-xs text-gray-400 mt-1">
                      {request.payload.mode === "match"
                        ? "confirm match"
                        : request.payload.mode === "create"
                          ? "create new"
                          : "review mapping"}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-500">
                    {type === "brand" &&
                      request.payload?.matched_brand_id != null && (
                        <div>Matched #{request.payload.matched_brand_id}</div>
                      )}
                    {type === "category" &&
                      request.payload?.matched_category_id != null && (
                        <div>
                          Matched leaf #{request.payload.matched_category_id}
                        </div>
                      )}
                    {type === "specs" && (
                      <div>
                        {(request.payload?.specifications ?? []).filter(
                          (s) => s.values?.length,
                        ).length}{" "}
                        specs ·{" "}
                        {(request.payload?.attributes ?? []).filter(
                          (a) => a.values?.length,
                        ).length}{" "}
                        attrs
                      </div>
                    )}
                    {request.submission_id && (
                      <div>Submission #{request.submission_id}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.status === "approved"
                        ? "success"
                        : request.status === "rejected"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setReviewing(request)}
                        color="var(--color-primary)"
                        className="h-10! px-3! text-sm!"
                      >
                        Review
                      </Button>
                      <Button
                        onClick={() =>
                          reject.mutate(
                            { id: request.id },
                            { onSuccess: () => refetch() },
                          )
                        }
                        disabled={reject.isPending}
                        variant="outline"
                        className="h-10! px-3! text-sm!"
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {type === "brand" && (
        <BrandRequestReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => refetch()}
        />
      )}
      {type === "category" && (
        <CategoryRequestReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => refetch()}
        />
      )}
      {type === "specs" && (
        <SpecsRequestReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => refetch()}
        />
      )}
    </>
  );
}
