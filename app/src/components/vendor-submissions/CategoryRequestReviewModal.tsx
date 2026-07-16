"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CategoryTreeSelect } from "@/components/products/CategoryTreeSelect";
import { useCategories } from "@/services/categories/hooks/use-categories";
import type { Category } from "@/services/categories/types/category.types";
import { useApproveCatalogRequest } from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type { CatalogRequest } from "@/services/vendor-submissions/types/vendor-submission.types";

type CategoryMode = "match" | "other" | "create";

type CategoryRequestReviewModalProps = {
  request: CatalogRequest | null;
  onClose: () => void;
  onDone?: () => void;
};

function findCategory(
  categories: Category[],
  id: number,
): Category | null {
  for (const category of categories) {
    if (category.id === id) return category;
    if (category.children?.length) {
      const found = findCategory(category.children, id);
      if (found) return found;
    }
  }
  return null;
}

function isLeafCategory(category: Category | null): boolean {
  if (!category) return false;
  return !category.children || category.children.length === 0;
}

export function CategoryRequestReviewModal({
  request,
  onClose,
  onDone,
}: CategoryRequestReviewModalProps) {
  const approve = useApproveCatalogRequest();
  const { data: categories = [] } = useCategories();

  const matchedId = request?.payload?.matched_category_id ?? null;
  const hasAiMatch = matchedId != null && Number(matchedId) > 0;
  const matchedCategory = hasAiMatch
    ? findCategory(categories, Number(matchedId))
    : null;

  const [mode, setMode] = useState<CategoryMode>("create");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [parentIds, setParentIds] = useState<string[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [leafError, setLeafError] = useState<string | undefined>();

  useEffect(() => {
    if (!request) return;
    setNameEn(String(request.payload?.name_en ?? ""));
    setNameAr(String(request.payload?.name_ar ?? ""));
    setLeafError(undefined);
    if (hasAiMatch) {
      setMode("match");
      setSelectedIds([String(matchedId)]);
    } else {
      setMode("create");
      setSelectedIds([]);
    }
    setParentIds(
      request.payload?.parent_id != null
        ? [String(request.payload.parent_id)]
        : [],
    );
  }, [request, hasAiMatch, matchedId]);

  const canConfirm = useMemo(() => {
    if (mode === "match") return hasAiMatch && isLeafCategory(matchedCategory);
    if (mode === "other") return selectedIds.length === 1;
    return nameEn.trim().length > 0 && nameAr.trim().length > 0;
  }, [mode, hasAiMatch, matchedCategory, selectedIds, nameEn, nameAr]);

  const handleApprove = async () => {
    if (!request) return;
    setLeafError(undefined);

    if (mode === "match" && matchedId) {
      if (!isLeafCategory(matchedCategory)) {
        setLeafError("AI match is not a leaf category. Pick another or create one.");
        return;
      }
      await approve.mutateAsync({
        id: request.id,
        input: { existing_entity_id: Number(matchedId) },
      });
    } else if (mode === "other") {
      const selected = findCategory(categories, Number(selectedIds[0]));
      if (!isLeafCategory(selected)) {
        setLeafError("Please select a leaf category (no subcategories).");
        return;
      }
      await approve.mutateAsync({
        id: request.id,
        input: { existing_entity_id: Number(selectedIds[0]) },
      });
    } else {
      await approve.mutateAsync({
        id: request.id,
        input: {
          create_new: true,
          name_en: nameEn.trim(),
          name_ar: nameAr.trim(),
          parent_id: parentIds[0] ? Number(parentIds[0]) : null,
        },
      });
    }
    onDone?.();
    onClose();
  };

  return (
    <Modal isOpen={!!request} onClose={onClose}>
      <div className="p-6 w-full max-w-xl">
        <h2 className="text-lg font-semibold mb-1">Review category</h2>
        <p className="text-sm text-gray-500 mb-4">
          Confirm the AI leaf category, pick another from the tree, or create a
          new leaf category.
        </p>

        {hasAiMatch && matchedCategory && (
          <div className="mb-4 p-3 rounded border border-secondary/40">
            <div className="text-xs uppercase text-gray-400 mb-1">AI match</div>
            <div className="font-medium">{matchedCategory.name_en}</div>
            <div className="text-sm text-gray-500" dir="rtl">
              {matchedCategory.name_ar}
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default">Category #{matchedCategory.id}</Badge>
              <Badge
                variant={isLeafCategory(matchedCategory) ? "success" : "danger"}
              >
                {isLeafCategory(matchedCategory) ? "Leaf" : "Not a leaf"}
              </Badge>
            </div>
          </div>
        )}

        {!hasAiMatch && (
          <div className="mb-4 p-3 rounded border border-warning/40 bg-yellow-50">
            <div className="text-xs uppercase text-gray-400 mb-1">
              AI suggested new category
            </div>
            <div className="font-medium">
              {request?.payload?.name_en || "No category detected"}
            </div>
            <div className="text-sm text-gray-500" dir="rtl">
              {request?.payload?.name_ar || ""}
            </div>
            {request?.payload?.reason && (
              <div className="text-xs text-gray-500 mt-1">
                {String(request.payload.reason)}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          {hasAiMatch && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="category-mode"
                checked={mode === "match"}
                onChange={() => setMode("match")}
              />
              Approve selected (AI matched) leaf category
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="category-mode"
              checked={mode === "other"}
              onChange={() => setMode("other")}
            />
            Select another category from the tree
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="category-mode"
              checked={mode === "create"}
              onChange={() => setMode("create")}
            />
            Approve / edit AI category creation
          </label>
        </div>

        {mode === "other" && (
          <CategoryTreeSelect
            label="Category (leaf only)"
            categories={categories}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            singleSelect
            error={leafError}
            placeholder="Select a leaf category"
          />
        )}

        {mode === "create" && (
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
            <CategoryTreeSelect
              label="Parent category (optional)"
              categories={categories}
              selectedIds={parentIds}
              onChange={setParentIds}
              singleSelect
              placeholder="Root if empty"
            />
          </div>
        )}

        {leafError && mode === "match" && (
          <p className="text-sm text-danger mt-2">{leafError}</p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!canConfirm || approve.isPending}
            color="var(--color-primary)"
          >
            {approve.isPending ? "Saving..." : "Approve"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
