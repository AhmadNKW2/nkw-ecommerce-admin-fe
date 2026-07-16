"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useBrands } from "@/services/brands/hooks/use-brands";
import { useApproveCatalogRequest } from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import type { CatalogRequest } from "@/services/vendor-submissions/types/vendor-submission.types";

type BrandMode = "match" | "other" | "create";

type BrandRequestReviewModalProps = {
  request: CatalogRequest | null;
  onClose: () => void;
  onDone?: () => void;
};

export function BrandRequestReviewModal({
  request,
  onClose,
  onDone,
}: BrandRequestReviewModalProps) {
  const approve = useApproveCatalogRequest();
  const { data: brandsData } = useBrands({ limit: 500 });
  const brands = brandsData?.data ?? [];

  const matchedId = request?.payload?.matched_brand_id ?? null;
  const hasAiMatch = matchedId != null && Number(matchedId) > 0;
  const hasAiCreate =
    !hasAiMatch &&
    Boolean(request?.payload?.name_en || request?.payload?.suggested_brand);

  const [mode, setMode] = useState<BrandMode>("create");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");

  useEffect(() => {
    if (!request) return;
    setNameEn(String(request.payload?.name_en ?? ""));
    setNameAr(String(request.payload?.name_ar ?? ""));
    if (hasAiMatch) {
      setMode("match");
      setSelectedBrandId(String(matchedId));
    } else {
      setMode("create");
      setSelectedBrandId("");
    }
  }, [request, hasAiMatch, matchedId]);

  const brandOptions = useMemo(
    () =>
      brands.map((brand) => ({
        value: String(brand.id),
        label: brand.name_en,
      })),
    [brands],
  );

  const matchedBrand = brands.find((b) => b.id === Number(matchedId));

  const canConfirm = useMemo(() => {
    if (mode === "match") return hasAiMatch;
    if (mode === "other") return Boolean(selectedBrandId);
    return nameEn.trim().length > 0 && nameAr.trim().length > 0;
  }, [mode, hasAiMatch, selectedBrandId, nameEn, nameAr]);

  const handleApprove = async () => {
    if (!request) return;
    if (mode === "match" && matchedId) {
      await approve.mutateAsync({
        id: request.id,
        input: { existing_entity_id: Number(matchedId) },
      });
    } else if (mode === "other") {
      await approve.mutateAsync({
        id: request.id,
        input: { existing_entity_id: Number(selectedBrandId) },
      });
    } else {
      await approve.mutateAsync({
        id: request.id,
        input: {
          create_new: true,
          name_en: nameEn.trim(),
          name_ar: nameAr.trim(),
        },
      });
    }
    onDone?.();
    onClose();
  };

  return (
    <Modal isOpen={!!request} onClose={onClose}>
      <div className="p-6 w-full max-w-lg">
        <h2 className="text-lg font-semibold mb-1">Review brand</h2>
        <p className="text-sm text-gray-500 mb-4">
          Confirm the AI brand, pick a different existing brand, or create a new
          one.
        </p>

        {hasAiMatch && matchedBrand && (
          <div className="mb-4 p-3 rounded border border-secondary/40">
            <div className="text-xs uppercase text-gray-400 mb-1">AI match</div>
            <div className="font-medium">{matchedBrand.name_en}</div>
            <div className="text-sm text-gray-500" dir="rtl">
              {matchedBrand.name_ar}
            </div>
            <Badge variant="default" className="mt-2">
              Brand #{matchedBrand.id}
            </Badge>
          </div>
        )}

        {!hasAiMatch && (
          <div className="mb-4 p-3 rounded border border-warning/40 bg-yellow-50">
            <div className="text-xs uppercase text-gray-400 mb-1">
              AI suggested new brand
            </div>
            <div className="font-medium">
              {request?.payload?.name_en || "No brand detected"}
            </div>
            <div className="text-sm text-gray-500" dir="rtl">
              {request?.payload?.name_ar || ""}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          {hasAiMatch && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="brand-mode"
                checked={mode === "match"}
                onChange={() => setMode("match")}
              />
              Approve selected (AI matched) brand
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="brand-mode"
              checked={mode === "other"}
              onChange={() => setMode("other")}
            />
            Select another existing brand
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="brand-mode"
              checked={mode === "create"}
              onChange={() => setMode("create")}
            />
            {hasAiCreate || !hasAiMatch
              ? "Approve / edit AI brand creation"
              : "Create a new brand"}
          </label>
        </div>

        {mode === "other" && (
          <Select
            label="Brand"
            search
            options={brandOptions}
            value={selectedBrandId}
            onChange={(value) => setSelectedBrandId(String(value))}
            placeholder="Select brand"
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
          </div>
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
