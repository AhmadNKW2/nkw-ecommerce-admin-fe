import type { VendorSubmissionStatus } from "@/services/vendor-submissions/types/vendor-submission.types";
import type { Stage2Value } from "@/services/vendor-submissions/types/vendor-submission.types";
import type { BadgeVariant } from "@/components/ui/badge";

export const SUBMISSION_STATUS_LABELS: Record<VendorSubmissionStatus, string> = {
  pending_ai: "Queued for AI",
  ai_processing: "AI processing",
  awaiting_brand: "Awaiting brand",
  awaiting_category: "Awaiting category",
  awaiting_category_specs: "Awaiting category setup",
  awaiting_specs_approval: "Awaiting specs & attributes",
  ready: "Ready",
  materialized: "Published",
  rejected: "Rejected",
  failed: "Failed",
};

/** Compact labels for narrow mobile badges. */
export const SUBMISSION_STATUS_SHORT_LABELS: Record<
  VendorSubmissionStatus,
  string
> = {
  pending_ai: "Queued",
  ai_processing: "Processing",
  awaiting_brand: "Brand",
  awaiting_category: "Category",
  awaiting_category_specs: "Setup",
  awaiting_specs_approval: "Specs",
  ready: "Ready",
  materialized: "Published",
  rejected: "Rejected",
  failed: "Failed",
};

export function submissionStatusVariant(
  status: VendorSubmissionStatus,
): BadgeVariant {
  switch (status) {
    case "materialized":
    case "ready":
      return "success";
    case "rejected":
    case "failed":
      return "danger";
    case "ai_processing":
    case "pending_ai":
      return "default";
    default:
      return "warning";
  }
}

export function stage2ValueLabel(value: Stage2Value): string {
  const original = value.original_value;
  if (typeof original === "string") return original;
  if (original && typeof original === "object") {
    const record = original as { name_en?: string; name_ar?: string };
    return record.name_en || record.name_ar || "";
  }
  return original != null ? String(original) : "";
}

