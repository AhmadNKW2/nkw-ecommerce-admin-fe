"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useVendorLocale } from "@/contexts/vendor-locale.context";
import type { VendorSubmission } from "@/services/vendor-submissions/types/vendor-submission.types";

type VendorPendingSubmissionCardProps = {
  submission: VendorSubmission;
  createdAtLabel?: string | null;
};

export function VendorPendingSubmissionCard({
  submission,
  createdAtLabel,
}: VendorPendingSubmissionCardProps) {
  const { copy } = useVendorLocale();
  const imageUrl =
    submission.media?.find((m) => m.is_primary)?.media?.url ||
    submission.media?.[0]?.media?.url;
  const inStock = submission.stock > 0;

  return (
    <Card
      className="!gap-3 !p-3 sm:!p-4"
      id={`submission-row-${submission.id}`}
      noFlex={false}
    >
      <div className="flex gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-primary/10 sm:h-16 sm:w-16">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={submission.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900" title={submission.title}>
            {submission.title}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Badge
              variant="danger"
              className="!px-2 !py-0.5 text-[10px] sm:text-xs"
            >
              {copy.hidden}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{copy.cost}</p>
          <p className="font-semibold tabular-nums">
            {submission.sale_price != null ? submission.sale_price : "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{copy.price}</p>
          <p className="font-semibold tabular-nums">{submission.price}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">{copy.stock}</p>
          <Badge
            variant={inStock ? "success" : "danger"}
            className="!mt-0.5 !px-2 !py-0.5 text-[10px] sm:text-xs"
          >
            {inStock ? copy.inStock : copy.outOfStock}
          </Badge>
        </div>
        {createdAtLabel ? (
          <div className="min-w-0">
            <p className="text-xs text-gray-500">{copy.created}</p>
            <p className="text-sm text-gray-700">{createdAtLabel}</p>
          </div>
        ) : null}
        <div className="col-span-2">
          <p className="text-xs text-gray-500">{copy.actions}</p>
          <p className="text-sm text-gray-500">{copy.pendingReview}</p>
        </div>
      </div>
    </Card>
  );
}
