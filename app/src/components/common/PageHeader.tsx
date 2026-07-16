"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../ui/button";
import { ADMIN_PAGE_HEADER_SLOT_ID } from "../layout/AdminHeader";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: string;
  iconBgColor?: string;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  cancelAction?: {
    label?: string;
    onClick: () => void;
    disabled?: boolean;
  };
  extraActions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  iconBgColor = "bg-primary",
  action,
  cancelAction,
  extraActions,
}) => {
  const hasActions = Boolean(action || cancelAction || extraActions);

  // Render into the global admin header when its slot exists.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(ADMIN_PAGE_HEADER_SLOT_ID));
  }, []);

  const actions = hasActions && (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
      {extraActions}
      {cancelAction && (
        <Button
          variant="solid"
          onClick={cancelAction.onClick}
          disabled={cancelAction.disabled}
          color="var(--color-primary2)"
        >
          {cancelAction.label || "Cancel"}
        </Button>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          disabled={action.disabled}
          className="!h-10 !px-3 !text-sm sm:!h-13 sm:!px-5 sm:!text-[16px]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );

  if (slot) {
    return createPortal(
      <div className="flex w-full min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`hidden shrink-0 rounded-r1 ${iconBgColor} p-2 shadow-sm sm:block`}>
            <span className="flex h-5 w-5 items-center justify-center text-white [&>svg]:h-5 [&>svg]:w-5">
              {icon}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-gray-900 sm:text-lg">
              {title}
            </h1>
            <p className="hidden truncate text-xs text-gray-600 sm:block">{description}</p>
          </div>
        </div>
        {actions}
      </div>,
      slot,
    );
  }

  // Fallback (e.g. pages rendered outside the admin shell).
  return (
    <div className="flex w-full max-w-full flex-col gap-4 rounded-r1 border border-b1 bg-white p-4 shadow-s1 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <div className={`shrink-0 rounded-r1 ${iconBgColor} p-2.5 shadow-sm sm:p-3`}>
          <span className="flex h-5 w-5 items-center justify-center text-white sm:h-6 sm:w-6 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">{title}</h1>
          <p className="mt-0.5 text-sm text-gray-600 sm:mt-1 sm:text-base">{description}</p>
        </div>
      </div>
      {actions}
    </div>
  );
};
