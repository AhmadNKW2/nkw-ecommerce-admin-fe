"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { cn } from "../../lib/utils";
import type { CodCollectionStatus } from "../../services/orders/types/order.types";

const OPTIONS: {
  value: CodCollectionStatus;
  label: string;
  icon: ReactNode;
  pillClass: string;
  selectedClass: string;
}[] = [
  {
    value: "pending",
    label: "Not received",
    icon: <CircleDashed className="w-3.5 h-3.5" />,
    pillClass: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    selectedClass:
      "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 shadow-sm",
  },
  {
    value: "received",
    label: "Received",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    pillClass: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    selectedClass:
      "bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-200 shadow-sm",
  },
];

interface CodCollectionPillsProps {
  value: CodCollectionStatus;
  onChange: (status: CodCollectionStatus) => void;
  disabled?: boolean;
  label?: ReactNode | null;
}

export function CodCollectionPills({
  value,
  onChange,
  disabled = false,
  label = null,
}: CodCollectionPillsProps) {
  const normalized: CodCollectionStatus =
    value === "received" ? "received" : "pending";

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      ) : null}
      <div className="inline-flex flex-wrap gap-1.5">
        {OPTIONS.map((option) => {
          const isSelected = normalized === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected ? option.selectedClass : option.pillClass,
              )}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
