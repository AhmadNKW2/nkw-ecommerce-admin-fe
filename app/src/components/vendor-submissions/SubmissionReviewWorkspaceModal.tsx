"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBrands } from "@/services/brands/hooks/use-brands";
import { useCategories } from "@/services/categories/hooks/use-categories";
import { useAttributes } from "@/services/attributes/hooks/use-attributes";
import { useSpecifications } from "@/services/specifications/hooks/use-specifications";
import type { Category } from "@/services/categories/types/category.types";
import {
  useCatalogRequest,
  useMaterializeSubmission,
  useRunSubmissionAi,
  useVendorSubmission,
} from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type {
  VendorSubmission,
  VendorSubmissionStatus,
} from "@/services/vendor-submissions/types/vendor-submission.types";
import {
  SUBMISSION_STATUS_LABELS,
  stage2ValueLabel,
  submissionStatusVariant,
} from "./submission-status";
import { BrandRequestReviewModal } from "./BrandRequestReviewModal";
import { CategoryRequestReviewModal } from "./CategoryRequestReviewModal";
import { SpecsRequestReviewModal } from "./SpecsRequestReviewModal";

type WorkspacePill =
  | "original"
  | "ai"
  | "brands"
  | "categories"
  | "specs";

const PILLS: { id: WorkspacePill; label: string }[] = [
  { id: "original", label: "original product details" },
  { id: "ai", label: "ai product details" },
  { id: "brands", label: "review brands" },
  { id: "categories", label: "review categories" },
  {
    id: "specs",
    label: "review attributes and specifications",
  },
];

type SubmissionReviewWorkspaceModalProps = {
  submission: VendorSubmission | null;
  onClose: () => void;
  onDone?: () => void;
};

function findCategory(categories: Category[], id: number): Category | null {
  for (const category of categories) {
    if (category.id === id) return category;
    if (category.children?.length) {
      const found = findCategory(category.children, id);
      if (found) return found;
    }
  }
  return null;
}

function defaultPillForStatus(status: VendorSubmissionStatus): WorkspacePill {
  switch (status) {
    case "awaiting_brand":
      return "brands";
    case "awaiting_category":
      return "categories";
    case "awaiting_category_specs":
      return "ai";
    case "awaiting_specs_approval":
      return "specs";
    case "ready":
      return "ai";
    default:
      return "original";
  }
}

export function SubmissionReviewWorkspaceModal({
  submission: initialSubmission,
  onClose,
  onDone,
}: SubmissionReviewWorkspaceModalProps) {
  const submissionId = initialSubmission?.id ?? 0;
  const { data: liveSubmission, refetch } = useVendorSubmission(submissionId, {
    enabled: !!initialSubmission,
  });
  const submission = liveSubmission ?? initialSubmission;

  const [activePill, setActivePill] = useState<WorkspacePill>("original");

  useEffect(() => {
    if (!initialSubmission) return;
    setActivePill(defaultPillForStatus(initialSubmission.status));
  }, [initialSubmission?.id]);

  const brandRequestQuery = useCatalogRequest(submission?.brand_request_id, {
    enabled: !!submission?.brand_request_id,
  });
  const categoryRequestQuery = useCatalogRequest(
    submission?.category_request_id,
    { enabled: !!submission?.category_request_id },
  );
  const specsRequestQuery = useCatalogRequest(submission?.specs_request_id, {
    enabled: !!submission?.specs_request_id,
  });
  const brandRequest = brandRequestQuery.data;
  const categoryRequest = categoryRequestQuery.data;
  const specsRequest = specsRequestQuery.data;

  const runAi = useRunSubmissionAi();
  const materialize = useMaterializeSubmission();
  const { data: brandsData } = useBrands({ limit: 500 });
  const { data: categories = [] } = useCategories();
  const { data: specifications = [] } = useSpecifications();
  const { data: attributes = [] } = useAttributes();

  const brand = useMemo(() => {
    if (!submission) return null;
    if (submission.resolved_brand_id) {
      return (
        brandsData?.data?.find((b) => b.id === submission.resolved_brand_id) ??
        null
      );
    }
    const matchName = submission.ai_result?.stage1?.brand_match;
    if (!matchName) return null;
    return (
      brandsData?.data?.find(
        (b) => b.name_en?.toLowerCase() === matchName.toLowerCase(),
      ) ?? null
    );
  }, [brandsData?.data, submission]);

  const category = useMemo(() => {
    if (!submission) return null;
    const categoryId =
      submission.resolved_category_id ??
      submission.ai_result?.stage1?.category_match ??
      null;
    if (!categoryId) return null;
    return findCategory(categories, categoryId);
  }, [categories, submission]);

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

  const handleRefresh = async () => {
    await refetch();
    onDone?.();
  };

  const handleCreateProduct = async () => {
    if (!submission) return;
    await materialize.mutateAsync(submission.id);
    await handleRefresh();
    onClose();
  };

  const handleRunAi = async () => {
    if (!submission) return;
    await runAi.mutateAsync(submission.id);
    await handleRefresh();
    setActivePill("specs");
  };

  const stage1 = submission?.ai_result?.stage1;
  const stage2 = submission?.ai_result?.stage2;
  const specs = (stage2?.specifications ?? []).filter((s) => s.values?.length);
  const attrs = (stage2?.attributes ?? []).filter((a) => a.values?.length);
  const media = submission?.media ?? [];

  return (
    <Modal
      isOpen={!!initialSubmission}
      onClose={onClose}
      className="max-w-[min(100%,56rem)]!"
      contentClassName="p-0! items-stretch! justify-start!"
    >
      {submission && (
        <div className="w-full flex flex-col min-h-0">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 pe-14">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Review submission #{submission.id}
                </h2>
                <p
                  className="text-sm text-gray-500 mt-1 max-w-xl truncate"
                  title={submission.title}
                >
                  {submission.title}
                </p>
              </div>
              <Badge variant={submissionStatusVariant(submission.status)}>
                {SUBMISSION_STATUS_LABELS[submission.status]}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActivePill(pill.id)}
                  className={`px-4 h-10 rounded-r1 border transition-all ${
                    activePill === pill.id
                      ? "bg-secondary text-white border-secondary"
                      : "border-secondary/40 text-gray-600 hover:bg-secondary/10"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
            {activePill === "original" && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs uppercase text-gray-400">Title</div>
                  <div className="font-medium">{submission.title}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-gray-400">
                    Description
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-gray-700">
                    {submission.description || "—"}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs uppercase text-gray-400">Vendor</div>
                    <div className="font-medium">#{submission.vendor_id}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">Price</div>
                    <div className="font-medium">{submission.price}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Sale / cost
                    </div>
                    <div className="font-medium">
                      {submission.sale_price ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">Stock</div>
                    <div className="font-medium">{submission.stock}</div>
                  </div>
                </div>
                {submission.error && (
                  <div className="p-3 rounded border border-danger/40 bg-red-50 text-sm text-danger">
                    {submission.error}
                  </div>
                )}
                {media.length > 0 && (
                  <div>
                    <div className="text-xs uppercase text-gray-400 mb-2">
                      Images
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {media.map((item) =>
                        item.media?.url ? (
                          <img
                            key={item.id}
                            src={item.media.url}
                            alt=""
                            className="w-20 h-20 object-cover rounded border border-gray-200"
                          />
                        ) : null,
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePill === "ai" && (
              <div className="flex flex-col gap-4">
                {stage1 && !stage2 && (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-r1 px-3 py-2">
                    Names and descriptions are generated after brand and
                    category are approved (Stage 2). Brand and category below
                    come from the first AI classification.
                  </div>
                )}

                {!stage2 && !stage1 && (
                  <div className="text-sm text-gray-500">
                    AI has not produced product details yet.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Name (EN)
                    </div>
                    <div className="font-medium">
                      {stage2?.title_en || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Name (AR)
                    </div>
                    <div className="font-medium" dir="rtl">
                      {stage2?.title_ar || "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Short description (EN)
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {stage2?.short_description_en || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Short description (AR)
                    </div>
                    <div className="text-sm whitespace-pre-wrap" dir="rtl">
                      {stage2?.short_description_ar || "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Long description (EN)
                    </div>
                    <div className="text-sm whitespace-pre-wrap">
                      {stage2?.description_en || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Long description (AR)
                    </div>
                    <div className="text-sm whitespace-pre-wrap" dir="rtl">
                      {stage2?.description_ar || "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs uppercase text-gray-400">Brand</div>
                    <div className="font-medium">
                      {brand?.name_en ||
                        stage1?.suggested_brand?.name_en ||
                        stage1?.brand_match ||
                        (submission.resolved_brand_id
                          ? `#${submission.resolved_brand_id}`
                          : "—")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">
                      Category
                    </div>
                    <div className="font-medium">
                      {category?.name_en ||
                        stage1?.suggested_category?.name_en ||
                        (submission.resolved_category_id
                          ? `#${submission.resolved_category_id}`
                          : stage1?.category_match
                            ? `#${stage1.category_match}`
                            : "—")}
                    </div>
                  </div>
                </div>

                {(specs.length > 0 || attrs.length > 0) && (
                  <>
                    <div>
                      <div className="text-xs uppercase text-gray-400 mb-2">
                        Specifications
                      </div>
                      {specs.length === 0 ? (
                        <div className="text-sm text-gray-400">
                          No values mapped.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {specs.map((spec) => (
                            <div key={spec.specification_id} className="text-sm">
                              <span className="font-medium">
                                {specNameById.get(spec.specification_id) ||
                                  `#${spec.specification_id}`}
                                :
                              </span>{" "}
                              {spec.values.map((value, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 mr-2"
                                >
                                  {stage2ValueLabel(value)}
                                  {value.matched_value_id === "not_exist" && (
                                    <Badge variant="secondary">New</Badge>
                                  )}
                                </span>
                              ))}
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
                        <div className="text-sm text-gray-400">
                          No values mapped.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {attrs.map((attr) => (
                            <div
                              key={attr.attribute.attribute_id}
                              className="text-sm"
                            >
                              <span className="font-medium">
                                {attrNameById.get(attr.attribute.attribute_id) ||
                                  `#${attr.attribute.attribute_id}`}
                                :
                              </span>{" "}
                              {attr.values.map((value, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 mr-2"
                                >
                                  {stage2ValueLabel(value)}
                                  {value.matched_value_id === "not_exist" && (
                                    <Badge variant="secondary">New</Badge>
                                  )}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  {submission.status === "awaiting_category_specs" && (
                    <Button
                      onClick={handleRunAi}
                      disabled={runAi.isPending}
                      color="var(--color-primary)"
                    >
                      {runAi.isPending ? "Running..." : "Run AI mapping"}
                    </Button>
                  )}
                  {submission.status === "ready" && (
                    <Button
                      onClick={handleCreateProduct}
                      disabled={materialize.isPending}
                      color="var(--color-primary)"
                    >
                      {materialize.isPending
                        ? "Creating..."
                        : "Create product"}
                    </Button>
                  )}
                  {submission.status === "materialized" &&
                    submission.product_id && (
                      <Button
                        href={`/products/${submission.product_id}`}
                        variant="outline"
                      >
                        Open product
                      </Button>
                    )}
                </div>
              </div>
            )}

            {activePill === "brands" &&
              (brandRequestQuery.isLoading ? (
                <p className="text-sm text-gray-500 py-6">Loading brand review…</p>
              ) : (
                <BrandRequestReviewModal
                  request={brandRequest ?? null}
                  onClose={onClose}
                  onDone={handleRefresh}
                  embedded
                />
              ))}

            {activePill === "categories" &&
              (categoryRequestQuery.isLoading ? (
                <p className="text-sm text-gray-500 py-6">
                  Loading category review…
                </p>
              ) : (
                <CategoryRequestReviewModal
                  request={categoryRequest ?? null}
                  onClose={onClose}
                  onDone={handleRefresh}
                  embedded
                />
              ))}

            {activePill === "specs" &&
              (specsRequestQuery.isLoading ? (
                <p className="text-sm text-gray-500 py-6">
                  Loading specs review…
                </p>
              ) : (
                <SpecsRequestReviewModal
                  request={specsRequest ?? null}
                  onClose={onClose}
                  onDone={handleRefresh}
                  embedded
                />
              ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
