"use client";

import { useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAttributes } from "@/services/attributes/hooks/use-attributes";
import { useSpecifications } from "@/services/specifications/hooks/use-specifications";
import {
  useApproveCatalogRequest,
  useRejectCatalogRequest,
} from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type { CatalogRequest } from "@/services/vendor-submissions/types/vendor-submission.types";
import { stage2ValueLabel } from "./submission-status";

type SpecsRequestReviewModalProps = {
  request: CatalogRequest | null;
  onClose: () => void;
  onDone?: () => void;
  /** Render form content without its own Modal (for workspace embedding). */
  embedded?: boolean;
};

export function SpecsRequestReviewModal({
  request,
  onClose,
  onDone,
  embedded = false,
}: SpecsRequestReviewModalProps) {
  const approve = useApproveCatalogRequest();
  const reject = useRejectCatalogRequest();
  const { data: specifications = [] } = useSpecifications();
  const { data: attributes = [] } = useAttributes();

  const specNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const spec of specifications) {
      map.set(spec.id, spec.name_en);
    }
    return map;
  }, [specifications]);

  const attrNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const attr of attributes) {
      map.set(attr.id, attr.name_en);
    }
    return map;
  }, [attributes]);

  const handleApprove = async () => {
    if (!request) return;
    await approve.mutateAsync({ id: request.id, input: {} });
    onDone?.();
    if (!embedded) onClose();
  };

  const handleReject = async () => {
    if (!request) return;
    await reject.mutateAsync({ id: request.id });
    onDone?.();
    if (!embedded) onClose();
  };

  const specs = (request?.payload?.specifications ?? []).filter(
    (s) => s.values?.length,
  );
  const attrs = (request?.payload?.attributes ?? []).filter(
    (a) => a.values?.length,
  );

  if (!request && !embedded) return null;

  const content = (
    <div className={embedded ? "w-full" : "p-6 w-full max-w-2xl"}>
      {!embedded && (
        <>
          <h2 className="text-lg font-semibold mb-1">
            Review specifications & attributes
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Approve the AI-mapped values. Items marked New will be created when
            the product is materialized.
          </p>
        </>
      )}

      {embedded && (
        <p className="text-sm text-gray-500 mb-4">
          Approve the AI-mapped values. Items marked New will be created when
          the product is materialized.
        </p>
      )}

      {!request ? (
        <div className="text-sm text-gray-500 py-6">
          No specifications request is linked to this submission yet. If the
          category is ready, run AI mapping from the AI product details tab.
        </div>
      ) : request.status !== "pending" ? (
        <div className="p-3 rounded border border-secondary/30 text-sm mb-4">
          Specs request is already{" "}
          <span className="font-medium">{request.status}</span>.
        </div>
      ) : null}

      {request && (
        <>
          <div className="mb-4">
            <div className="text-xs uppercase text-gray-400">Product title</div>
            <div className="font-medium">
              {String(request.payload?.title_en ?? "—")}
            </div>
            <div className="text-sm text-gray-500" dir="rtl">
              {String(request.payload?.title_ar ?? "")}
            </div>
          </div>

          <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-1">
            <div>
              <div className="text-xs uppercase text-gray-400 mb-2">
                Specifications
              </div>
              {specs.length === 0 ? (
                <div className="text-sm text-gray-400">No values mapped.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {specs.map((spec) => (
                    <div
                      key={spec.specification_id}
                      className="p-3 rounded border border-secondary/30"
                    >
                      <div className="font-medium text-sm mb-1">
                        {specNameById.get(spec.specification_id) ||
                          `Specification #${spec.specification_id}`}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {spec.values.map((value, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 text-sm"
                          >
                            {stage2ValueLabel(value)}
                            {value.matched_value_id === "not_exist" && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase text-gray-400 mb-2">
                Attributes
              </div>
              {attrs.length === 0 ? (
                <div className="text-sm text-gray-400">No values mapped.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {attrs.map((attr) => (
                    <div
                      key={attr.attribute.attribute_id}
                      className="p-3 rounded border border-secondary/30"
                    >
                      <div className="font-medium text-sm mb-1">
                        {attrNameById.get(attr.attribute.attribute_id) ||
                          `Attribute #${attr.attribute.attribute_id}`}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {attr.values.map((value, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 text-sm"
                          >
                            {stage2ValueLabel(value)}
                            {value.matched_value_id === "not_exist" && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {request.status === "pending" && (
            <div className="flex justify-end gap-2 mt-6">
              {!embedded && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={reject.isPending || approve.isPending}
              >
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approve.isPending || reject.isPending}
                color="var(--color-primary)"
              >
                {approve.isPending ? "Approving..." : "Approve"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <Modal isOpen={!!request} onClose={onClose}>
      {content}
    </Modal>
  );
}
