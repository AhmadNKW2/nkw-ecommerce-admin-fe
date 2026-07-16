"use client";

import { ImageIcon, Package } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useVendorLocale } from "@/contexts/vendor-locale.context";

export type SubmitReviewPreview = {
  title: string;
  description: string;
  cost: string;
  price: string;
  images: { name: string; url: string }[];
};

type SubmitReviewConfirmModalProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  preview: SubmitReviewPreview;
  onConfirm: () => void;
  onCancel: () => void;
};

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-r1 border border-b1 bg-primary/5 px-3 py-2.5 sm:px-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-gray-900 sm:text-base">
        {value}
      </p>
    </div>
  );
}

export function SubmitReviewConfirmModal({
  isOpen,
  isSubmitting = false,
  preview,
  onConfirm,
  onCancel,
}: SubmitReviewConfirmModalProps) {
  const { copy, isRtl } = useVendorLocale();

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => undefined : onCancel}
      closeOnBackdrop={!isSubmitting}
      className="max-w-lg w-full sm:max-w-xl"
      contentClassName="!items-stretch !justify-start gap-0 !p-0"
    >
      <div dir={isRtl ? "rtl" : "ltr"} className="flex min-h-0 w-full flex-col">
        <div className="border-b border-b1 px-4 pb-4 pt-5 pe-14 sm:px-6 sm:pt-6 sm:pe-16">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-r1 bg-primary text-white shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 sm:text-lg">
                {copy.confirmSubmitTitle}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {copy.confirmSubmitMessage}
              </p>
            </div>
          </div>
        </div>

        <div className="flex max-h-[min(60vh,28rem)] min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {copy.images}
            </p>
            {preview.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                {preview.images.map((image) => (
                  <div
                    key={image.url}
                    className="aspect-square overflow-hidden rounded-r1 border border-b1 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-r1 border border-dashed border-b1 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                <ImageIcon className="h-4 w-4 shrink-0" />
                <span>{copy.noImages}</span>
              </div>
            )}
          </div>

          <SummaryRow label={copy.productTitle} value={preview.title} />
          <SummaryRow label={copy.description} value={preview.description} />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <SummaryRow label={copy.cost} value={preview.cost} />
            <SummaryRow label={copy.salePrice} value={preview.price} />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-b1 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {copy.confirmSubmitNo}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            color="var(--color-primary)"
            className="w-full sm:w-auto"
          >
            {isSubmitting ? copy.submitting : copy.confirmSubmitYes}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
