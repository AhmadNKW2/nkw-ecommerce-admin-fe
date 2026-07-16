"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { VendorSubmission } from "@/services/vendor-submissions/types/vendor-submission.types";
import {
  SUBMISSION_STATUS_SHORT_LABELS,
  submissionStatusVariant,
} from "./submission-status";

type VendorPendingSubmissionCardProps = {
  submission: VendorSubmission;
  createdAtLabel?: string | null;
};

export function VendorPendingSubmissionCard({
  submission,
  createdAtLabel,
}: VendorPendingSubmissionCardProps) {
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
            <Badge variant="warning" className="!px-2 !py-0.5 text-[10px] sm:text-xs">
              Without approval
            </Badge>
            <Badge
              variant={submissionStatusVariant(submission.status)}
              className="!px-2 !py-0.5 text-[10px] sm:text-xs"
            >
              {SUBMISSION_STATUS_SHORT_LABELS[submission.status]}
            </Badge>
            <Badge
              variant="danger"
              className="!px-2 !py-0.5 text-[10px] sm:text-xs"
            >
              Hidden
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Price</p>
          <p className="font-semibold tabular-nums">{submission.price}</p>
          {submission.sale_price != null ? (
            <p className="text-xs text-gray-500 tabular-nums">
              Sale {submission.sale_price}
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Stock</p>
          <Badge
            variant={inStock ? "success" : "danger"}
            className="!mt-0.5 !px-2 !py-0.5 text-[10px] sm:text-xs"
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
        {createdAtLabel ? (
          <div className="col-span-2 min-w-0">
            <p className="text-xs text-gray-500">Created</p>
            <p className="text-sm text-gray-700">{createdAtLabel}</p>
          </div>
        ) : null}
        <div className="col-span-2">
          <p className="text-xs text-gray-500">Actions</p>
          <p className="text-sm text-gray-500">Pending review</p>
        </div>
      </div>
    </Card>
  );
}
