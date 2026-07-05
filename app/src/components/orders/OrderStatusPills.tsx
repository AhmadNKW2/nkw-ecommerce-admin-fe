"use client";

import React from "react";
import { CheckCircle2, Clock, AlertCircle, Receipt } from "lucide-react";
import { cn } from "../../lib/utils";
import type { OrderStatus } from "../../services/orders/types/order.types";

export const ORDER_STATUS_PILL_OPTIONS: {
  value: OrderStatus;
  label: string;
  icon: React.ReactNode;
  pillClass: string;
  selectedClass: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    icon: <Clock className="w-3.5 h-3.5" />,
    pillClass: "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
    selectedClass: "bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 shadow-sm",
  },
  {
    value: "delivered",
    label: "Delivered",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    pillClass: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
    selectedClass: "bg-emerald-500 text-white border-emerald-500 ring-2 ring-emerald-200 shadow-sm",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    pillClass: "bg-red-50 text-red-800 border-red-200 hover:bg-red-100",
    selectedClass: "bg-red-500 text-white border-red-500 ring-2 ring-red-200 shadow-sm",
  },
  {
    value: "refunded",
    label: "Refunded",
    icon: <Receipt className="w-3.5 h-3.5" />,
    pillClass: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
    selectedClass: "bg-slate-600 text-white border-slate-600 ring-2 ring-slate-200 shadow-sm",
  },
];

interface OrderStatusPillsProps {
  value: OrderStatus | "";
  onChange: (status: OrderStatus) => void;
  disabled?: boolean;
  label?: React.ReactNode;
}

export function OrderStatusPills({
  value,
  onChange,
  disabled = false,
  label = "Order Status",
}: OrderStatusPillsProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUS_PILL_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected ? option.selectedClass : option.pillClass
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
