"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { Badge } from "../src/components/ui/badge";
import { Input } from "../src/components/ui/input";
import { Modal } from "../src/components/ui/modal";
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
  useApproveCatalogRequest,
  useCatalogRequests,
  useRejectCatalogRequest,
} from "../src/services/vendor-submissions/hooks/use-vendor-submissions";
import type {
  CatalogRequest,
  CatalogRequestStatus,
  CatalogRequestType,
} from "../src/services/vendor-submissions/types/vendor-submission.types";

const TYPE_FILTERS: { value: CatalogRequestType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "brand", label: "Brands" },
  { value: "category", label: "Categories" },
];

const STATUS_FILTERS: { value: CatalogRequestStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function statusVariant(status: CatalogRequestStatus) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  return "warning" as const;
}

export default function CatalogRequestsPage() {
  const [typeFilter, setTypeFilter] = useState<CatalogRequestType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CatalogRequestStatus | "all">(
    "pending",
  );
  const [approving, setApproving] = useState<CatalogRequest | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const { data, isLoading } = useCatalogRequests(
    {
      page: 1,
      limit: 50,
      type: typeFilter === "all" ? undefined : typeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    { refetchInterval: 15000 },
  );

  const approve = useApproveCatalogRequest();
  const reject = useRejectCatalogRequest();

  const requests = (data?.data ?? []) as CatalogRequest[];

  const openApprove = (request: CatalogRequest) => {
    setApproving(request);
    setNameEn(String(request.payload?.name_en ?? ""));
    setNameAr(String(request.payload?.name_ar ?? ""));
    setParentId(
      request.payload?.parent_id != null
        ? String(request.payload.parent_id)
        : "",
    );
  };

  const closeApprove = () => setApproving(null);

  const confirmApprove = async () => {
    if (!approving) return;
    await approve.mutateAsync({
      id: approving.id,
      input: {
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
        parent_id:
          approving.type === "category"
            ? parentId.trim() === ""
              ? null
              : Number(parentId)
            : undefined,
      },
    });
    closeApprove();
  };

  const canConfirm = useMemo(
    () => nameEn.trim().length > 0 && nameAr.trim().length > 0,
    [nameEn, nameAr],
  );

  return (
    <div className="admin-page">
      <PageHeader
        icon={<CheckCircle2 />}
        title="Catalog Requests"
        description="Approve or reject brand and category creation requests raised by AI product submissions."
      />

      <Card>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value)}
                className={`px-4 h-10 rounded-r1 border transition-all ${
                  typeFilter === filter.value
                    ? "bg-secondary text-white border-secondary"
                    : "border-secondary/40 text-gray-600 hover:bg-secondary/10"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-4 h-10 rounded-r1 border transition-all ${
                  statusFilter === filter.value
                    ? "bg-primary text-white border-primary"
                    : "border-primary/30 text-gray-600 hover:bg-primary/10"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
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
            description="No catalog requests match this filter."
          />
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead>Suggested name</TableHead>
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
                  <Badge variant={request.type === "brand" ? "default" : "default2"}>
                    {request.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{request.payload?.name_en}</div>
                  <div className="text-sm text-gray-500" dir="rtl">
                    {request.payload?.name_ar}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-500 max-w-[260px]">
                    {request.type === "category" && (
                      <div>
                        Parent:{" "}
                        {request.payload?.parent_id != null
                          ? `#${request.payload.parent_id}`
                          : "root"}
                      </div>
                    )}
                    {request.payload?.reason && (
                      <div className="truncate" title={String(request.payload.reason)}>
                        {String(request.payload.reason)}
                      </div>
                    )}
                    {request.submission_id && (
                      <div>Submission #{request.submission_id}</div>
                    )}
                    {request.result_entity_id && (
                      <div className="text-success">
                        Created #{request.result_entity_id}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(request.status)}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => openApprove(request)}
                        color="var(--color-primary)"
                        className="h-10! px-3! text-sm!"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => reject.mutate({ id: request.id })}
                        disabled={reject.isPending}
                        variant="outline"
                        className="h-10! px-3! text-sm!"
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {request.admin_notes || "—"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Modal isOpen={!!approving} onClose={closeApprove}>
        <div className="p-6 w-full max-w-md">
          <h2 className="text-lg font-semibold mb-1">
            Approve {approving?.type}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {approving?.type === "category"
              ? "Create the category. After approval, add its specifications and attributes, then run AI mapping on the submission."
              : "Create the brand and attach it to the submission."}
          </p>
          <div className="flex flex-col gap-4">
            <Input
              label="Name (English)"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
            <Input
              label="Name (Arabic)"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              isRtl
            />
            {approving?.type === "category" && (
              <Input
                label="Parent category id (empty = root)"
                type="number"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={closeApprove}>
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={!canConfirm || approve.isPending}
              color="var(--color-primary)"
            >
              {approve.isPending ? "Approving..." : "Approve"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
