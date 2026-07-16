"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  Stage2Value,
} from "../src/services/vendor-submissions/types/vendor-submission.types";

const TYPE_FILTERS: { value: CatalogRequestType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "brand", label: "Brands" },
  { value: "category", label: "Categories" },
  { value: "specs", label: "Specs & attributes" },
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

function valueLabel(value: Stage2Value): string {
  const original = value.original_value;
  if (typeof original === "string") return original;
  if (original && typeof original === "object") {
    const record = original as { name_en?: string; name_ar?: string };
    return record.name_en || record.name_ar || "";
  }
  return original != null ? String(original) : "";
}

export default function CatalogRequestsPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type");
  const [typeFilter, setTypeFilter] = useState<CatalogRequestType | "all">(
    initialType === "brand" ||
      initialType === "category" ||
      initialType === "specs"
      ? initialType
      : "all",
  );
  const [statusFilter, setStatusFilter] = useState<CatalogRequestStatus | "all">(
    "pending",
  );
  const [approving, setApproving] = useState<CatalogRequest | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [createNew, setCreateNew] = useState(false);

  useEffect(() => {
    if (
      initialType === "brand" ||
      initialType === "category" ||
      initialType === "specs"
    ) {
      setTypeFilter(initialType);
    }
  }, [initialType]);

  const { data, isLoading, refetch } = useCatalogRequests(
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
    setCreateNew(request.payload?.mode === "create");
  };

  const closeApprove = () => setApproving(null);

  const isMatch =
    approving?.type !== "specs" &&
    approving?.payload?.mode === "match" &&
    !createNew;

  const confirmApprove = async () => {
    if (!approving) return;

    if (approving.type === "specs") {
      await approve.mutateAsync({ id: approving.id, input: {} });
      closeApprove();
      refetch();
      return;
    }

    const matchedId =
      approving.type === "brand"
        ? approving.payload?.matched_brand_id
        : approving.payload?.matched_category_id;

    await approve.mutateAsync({
      id: approving.id,
      input: {
        name_en: nameEn.trim() || undefined,
        name_ar: nameAr.trim() || undefined,
        parent_id:
          approving.type === "category"
            ? parentId.trim() === ""
              ? null
              : Number(parentId)
            : undefined,
        existing_entity_id:
          isMatch && matchedId != null ? Number(matchedId) : undefined,
        create_new: createNew || undefined,
      },
    });
    closeApprove();
    refetch();
  };

  const canConfirm = useMemo(() => {
    if (!approving) return false;
    if (approving.type === "specs") return true;
    if (isMatch) return true;
    return nameEn.trim().length > 0 && nameAr.trim().length > 0;
  }, [approving, isMatch, nameEn, nameAr]);

  return (
    <div className="admin-page">
      <PageHeader
        icon={<CheckCircle2 />}
        title="Catalog Requests"
        description="Approve, edit, or reject brand, category, and specs mapping requests. Review & create stays locked until all three are approved."
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
              <TableHead className="w-28">Type</TableHead>
              <TableHead>Suggestion</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-56">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const mode = request.payload?.mode;
              return (
                <TableRow key={request.id}>
                  <TableCell className="font-mono text-sm text-gray-500">
                    #{request.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={
                          request.type === "brand"
                            ? "default"
                            : request.type === "specs"
                              ? "warning"
                              : "default2"
                        }
                      >
                        {request.type}
                      </Badge>
                      {mode && mode !== "review" && (
                        <span className="text-xs text-gray-500">
                          {mode === "match" ? "confirm match" : "create new"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.type === "specs" ? (
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
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500 max-w-[280px]">
                      {request.type === "brand" &&
                        request.payload?.matched_brand_id != null && (
                          <div>
                            Matched brand #{request.payload.matched_brand_id}
                          </div>
                        )}
                      {request.type === "category" && (
                        <>
                          {request.payload?.matched_category_id != null && (
                            <div>
                              Matched leaf #{request.payload.matched_category_id}
                            </div>
                          )}
                          <div>
                            Parent:{" "}
                            {request.payload?.parent_id != null
                              ? `#${request.payload.parent_id}`
                              : "root"}
                          </div>
                        </>
                      )}
                      {request.type === "specs" && (
                        <div>
                          {(request.payload?.specifications ?? []).filter(
                            (s) => s.values?.length,
                          ).length}{" "}
                          specs ·{" "}
                          {(request.payload?.attributes ?? []).filter(
                            (a) => a.values?.length,
                          ).length}{" "}
                          attrs mapped
                        </div>
                      )}
                      {request.payload?.reason && (
                        <div
                          className="truncate"
                          title={String(request.payload.reason)}
                        >
                          {String(request.payload.reason)}
                        </div>
                      )}
                      {request.submission_id && (
                        <div>Submission #{request.submission_id}</div>
                      )}
                      {request.result_entity_id && (
                        <div className="text-success">
                          Entity #{request.result_entity_id}
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
                          {request.type === "specs"
                            ? "Review"
                            : mode === "match"
                              ? "Confirm"
                              : "Approve"}
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
                      <span className="text-sm text-gray-400">
                        {request.admin_notes || "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Modal isOpen={!!approving} onClose={closeApprove}>
        <div className="p-6 w-full max-w-lg">
          {approving?.type === "specs" ? (
            <>
              <h2 className="text-lg font-semibold mb-1">
                Approve specs & attributes
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Confirm the AI-mapped values. New values will be created when the
                product is materialized.
              </p>
              <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto mb-4">
                <div>
                  <div className="text-xs uppercase text-gray-400">Title</div>
                  <div className="font-medium">
                    {String(approving.payload?.title_en ?? "—")}
                  </div>
                </div>
                {(approving.payload?.specifications ?? [])
                  .filter((s) => s.values?.length)
                  .map((spec) => (
                    <div key={spec.specification_id} className="text-sm">
                      Spec #{spec.specification_id}:{" "}
                      {spec.values.map((v) => valueLabel(v)).join(", ")}
                      {spec.values.some((v) => v.matched_value_id === "not_exist") && (
                        <Badge variant="secondary" className="ml-2">
                          New
                        </Badge>
                      )}
                    </div>
                  ))}
                {(approving.payload?.attributes ?? [])
                  .filter((a) => a.values?.length)
                  .map((attr) => (
                    <div key={attr.attribute.attribute_id} className="text-sm">
                      Attr #{attr.attribute.attribute_id}:{" "}
                      {attr.values.map((v) => valueLabel(v)).join(", ")}
                      {attr.values.some((v) => v.matched_value_id === "not_exist") && (
                        <Badge variant="secondary" className="ml-2">
                          New
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1">
                {isMatch ? "Confirm" : "Approve"} {approving?.type}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {approving?.type === "category"
                  ? isMatch
                    ? "Confirm the matched leaf category, or switch to create a new leaf category."
                    : "Create a leaf category at the chosen tree position. Then add specs/attributes if needed and run AI mapping."
                  : isMatch
                    ? "Confirm the matched brand, or switch to create a new brand."
                    : "Create the brand and attach it to the submission."}
              </p>

              {approving?.payload?.mode === "match" && (
                <label className="flex items-center gap-2 mb-4 text-sm">
                  <input
                    type="checkbox"
                    checked={createNew}
                    onChange={(e) => setCreateNew(e.target.checked)}
                  />
                  Create a new {approving.type} instead of using the match
                </label>
              )}

              <div className="flex flex-col gap-4">
                <Input
                  label="Name (English)"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  disabled={isMatch}
                />
                <Input
                  label="Name (Arabic)"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  isRtl
                  disabled={isMatch}
                />
                {approving?.type === "category" && !isMatch && (
                  <Input
                    label="Parent category id (empty = root)"
                    type="number"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                  />
                )}
                {isMatch && approving?.type === "brand" && (
                  <div className="text-sm text-gray-500">
                    Will use brand #{approving.payload?.matched_brand_id}
                  </div>
                )}
                {isMatch && approving?.type === "category" && (
                  <div className="text-sm text-gray-500">
                    Will use leaf category #
                    {approving.payload?.matched_category_id}
                  </div>
                )}
              </div>
            </>
          )}

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
