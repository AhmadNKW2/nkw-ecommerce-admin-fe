import { CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "../ui/badge";
import type { CodCollectionStatus } from "../../services/orders/types/order.types";
import { cn } from "../../lib/utils";

const LABELS: Record<CodCollectionStatus, string> = {
  pending: "Not received",
  received: "Received",
};

const VARIANTS: Record<CodCollectionStatus, "warning" | "success"> = {
  pending: "warning",
  received: "success",
};

export function getCodCollectionLabel(
  status: CodCollectionStatus | null | undefined,
): string {
  if (!status) return "—";
  return LABELS[status] ?? status;
}

/** Small icon next to the COD amount (list column). */
export function CodCollectionStatusIcon({
  status,
  className,
}: {
  status: CodCollectionStatus | null | undefined;
  className?: string;
}) {
  if (!status) return null;

  if (status === "received") {
    return (
      <span title="Received from shipping" className="inline-flex shrink-0">
        <CheckCircle2
          className={cn("w-3.5 h-3.5 text-green-600 shrink-0", className)}
        />
      </span>
    );
  }

  return (
    <span title="Not received from shipping" className="inline-flex shrink-0">
      <CircleDashed
        className={cn("w-3.5 h-3.5 text-amber-600 shrink-0", className)}
      />
    </span>
  );
}

export function CodCollectionBadge({
  status,
}: {
  status: CodCollectionStatus | null | undefined;
}) {
  if (!status) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  // Treat legacy with_courier as not received.
  const normalized: CodCollectionStatus =
    status === "received" ? "received" : "pending";

  return (
    <Badge
      variant={VARIANTS[normalized]}
      className="whitespace-nowrap"
    >
      {LABELS[normalized]}
    </Badge>
  );
}
