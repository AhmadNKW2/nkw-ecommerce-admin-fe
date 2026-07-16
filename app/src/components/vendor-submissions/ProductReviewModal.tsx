"use client";

import { useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBrands } from "@/services/brands/hooks/use-brands";
import { useCategories } from "@/services/categories/hooks/use-categories";
import { useAttributes } from "@/services/attributes/hooks/use-attributes";
import { useSpecifications } from "@/services/specifications/hooks/use-specifications";
import type { Category } from "@/services/categories/types/category.types";
import { useMaterializeSubmission } from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type { VendorSubmission } from "@/services/vendor-submissions/types/vendor-submission.types";
import { stage2ValueLabel } from "./submission-status";

type ProductReviewModalProps = {
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

export function ProductReviewModal({
  submission,
  onClose,
  onDone,
}: ProductReviewModalProps) {
  const materialize = useMaterializeSubmission();
  const { data: brandsData } = useBrands({ limit: 500 });
  const { data: categories = [] } = useCategories();
  const { data: specifications = [] } = useSpecifications();
  const { data: attributes = [] } = useAttributes();

  const brand = useMemo(() => {
    if (!submission?.resolved_brand_id) return null;
    return (
      brandsData?.data?.find((b) => b.id === submission.resolved_brand_id) ??
      null
    );
  }, [brandsData?.data, submission?.resolved_brand_id]);

  const category = useMemo(() => {
    if (!submission?.resolved_category_id) return null;
    return findCategory(categories, submission.resolved_category_id);
  }, [categories, submission?.resolved_category_id]);

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

  const stage2 = submission?.ai_result?.stage2;
  const specs = (stage2?.specifications ?? []).filter((s) => s.values?.length);
  const attrs = (stage2?.attributes ?? []).filter((a) => a.values?.length);

  const handleCreate = async () => {
    if (!submission) return;
    await materialize.mutateAsync(submission.id);
    onDone?.();
    onClose();
  };

  return (
    <Modal isOpen={!!submission} onClose={onClose}>
      <div className="p-6 w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-1">Review product</h2>
        <p className="text-sm text-gray-500 mb-4">
          Confirm name, brand, category, specifications, and attributes before
          creating the product.
        </p>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <div className="text-xs uppercase text-gray-400">Name (EN)</div>
            <div className="font-medium">{stage2?.title_en || "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-gray-400">Name (AR)</div>
            <div className="font-medium" dir="rtl">
              {stage2?.title_ar || "—"}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase text-gray-400">Brand</div>
              <div className="font-medium">
                {brand?.name_en ||
                  (submission?.resolved_brand_id
                    ? `#${submission.resolved_brand_id}`
                    : "—")}
              </div>
              {brand?.name_ar && (
                <div className="text-sm text-gray-500" dir="rtl">
                  {brand.name_ar}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase text-gray-400">Category</div>
              <div className="font-medium">
                {category?.name_en ||
                  (submission?.resolved_category_id
                    ? `#${submission.resolved_category_id}`
                    : "—")}
              </div>
              {category?.name_ar && (
                <div className="text-sm text-gray-500" dir="rtl">
                  {category.name_ar}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-gray-400 mb-2">
              Specifications
            </div>
            {specs.length === 0 ? (
              <div className="text-sm text-gray-400">No values mapped.</div>
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
              <div className="text-sm text-gray-400">No values mapped.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {attrs.map((attr) => (
                  <div key={attr.attribute.attribute_id} className="text-sm">
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
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={materialize.isPending}
            color="var(--color-primary)"
          >
            {materialize.isPending ? "Creating..." : "Create product"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
