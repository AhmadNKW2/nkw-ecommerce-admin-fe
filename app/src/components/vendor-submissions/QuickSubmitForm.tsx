"use client";

import { useMemo, useState } from "react";
import { Upload, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mediaService } from "@/services/media/api/media.service";
import { showErrorToast } from "@/lib/toast";
import { useCreateVendorSubmission } from "@/services/vendor-submissions/hooks/use-vendor-submissions";
import { useVendorLocale } from "@/contexts/vendor-locale.context";
import { SubmitReviewConfirmModal } from "./SubmitReviewConfirmModal";

type QuickSubmitFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  /** When true, skip success toasts (vendor portal has no notifications). */
  silentSuccess?: boolean;
  /** Hide card title when the page already has a PageHeader. */
  hideHeading?: boolean;
};

export function QuickSubmitForm({
  onSuccess,
  onCancel,
  silentSuccess = true,
  hideHeading = false,
}: QuickSubmitFormProps) {
  const { copy, isRtl } = useVendorLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const createSubmission = useCreateVendorSubmission({ silent: silentSuccess });
  const isBusy = isUploading || createSubmission.isPending;

  const previews = useMemo(
    () =>
      files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  const costIsNegative = cost !== "" && Number(cost) < 0;
  const costExceedsPrice =
    cost !== "" &&
    price !== "" &&
    !Number.isNaN(Number(cost)) &&
    !Number.isNaN(Number(price)) &&
    Number(cost) > Number(price);

  const costError = costIsNegative
    ? copy.costMustBeValid
    : costExceedsPrice
      ? copy.costMustNotExceedPrice
      : undefined;

  const isFormValid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    cost !== "" &&
    Number(cost) >= 0 &&
    price !== "" &&
    Number(price) >= 0 &&
    !costExceedsPrice &&
    stock !== "" &&
    Number(stock) >= 0;

  const canOpenConfirm = isFormValid && !isBusy;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCost("");
    setPrice("");
    setStock("");
    setFiles([]);
    setConfirmOpen(false);
  };

  const openConfirm = () => {
    if (!canOpenConfirm) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!isFormValid || isBusy) return;

    try {
      let media: { media_id: number; is_primary?: boolean; sort_order?: number }[] =
        [];
      if (files.length > 0) {
        setIsUploading(true);
        const uploaded = await mediaService.uploadMultipleMedia(files);
        media = uploaded.map((item, index) => ({
          media_id: item.id,
          is_primary: index === 0,
          sort_order: index,
        }));
      }
      await createSubmission.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        cost: Number(cost),
        stock: Number(stock),
        media,
      });
      resetForm();
      onSuccess?.();
    } catch (error) {
      showErrorToast((error as Error)?.message || copy.submitFailed);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Card
        className="!gap-4 !p-3 sm:!p-4 md:!p-5"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {!hideHeading ? (
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              {copy.createProduct}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{copy.formSubtitle}</p>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-col gap-4">
          <Input
            label={copy.productTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            isRtl={isRtl}
          />
          <Textarea
            label={copy.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            minRows={4}
            isRtl={isRtl}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={copy.cost}
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              isRtl={isRtl}
              error={costError}
            />
            <Input
              label={copy.salePrice}
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              isRtl={isRtl}
            />
            <Input
              label={copy.stockQty}
              type="number"
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              isRtl={isRtl}
            />
          </div>

          <div className="min-w-0">
            <label className="inline-flex h-13 min-w-13 w-full cursor-pointer items-center justify-center gap-2 rounded-r1 border border-primary2 px-5 text-[16px] font-medium text-primary2 transition-all hover:bg-primary2 hover:text-white sm:w-auto">
              <Upload className="h-5 w-5 shrink-0" />
              <span>{copy.addImages}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles((prev) => [
                      ...prev,
                      ...Array.from(e.target.files!),
                    ]);
                  }
                }}
              />
            </label>

            {previews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
                {previews.map((preview, index) => (
                  <div
                    key={preview.url}
                    className="relative h-20 w-20 overflow-hidden rounded border border-secondary bg-white sm:h-24 sm:w-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="h-full w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      className="absolute top-1 start-1 rounded-full bg-black/60 p-1 text-white"
                      aria-label={`Remove ${preview.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
            <Button
              onClick={openConfirm}
              disabled={!canOpenConfirm}
              color="var(--color-primary)"
              className="w-full sm:w-auto"
            >
              {copy.submit}
            </Button>
            {onCancel ? (
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isBusy}
                className="w-full sm:w-auto"
              >
                {copy.cancel}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <SubmitReviewConfirmModal
        isOpen={confirmOpen}
        isSubmitting={isBusy}
        preview={{
          title: title.trim(),
          description: description.trim(),
          cost,
          price,
          stock,
          images: previews,
        }}
        onConfirm={handleConfirmSubmit}
        onCancel={() => {
          if (!isBusy) setConfirmOpen(false);
        }}
      />
    </>
  );
}
