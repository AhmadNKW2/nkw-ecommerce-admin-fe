"use client";

import React from "react";
import { Button } from "../ui/button";

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

  return (
    <div className="flex w-full max-w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
        <div className={`shrink-0 rounded-r1 ${iconBgColor} p-2.5 sm:p-3`}>
          <span className="flex h-5 w-5 items-center justify-center text-white sm:h-6 sm:w-6 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
            {icon}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">{title}</h1>
          <p className="mt-0.5 text-sm sm:mt-1 sm:text-base">{description}</p>
        </div>
      </div>
      {hasActions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
          {extraActions}
          {cancelAction && (
            <Button
              variant="solid"
              onClick={cancelAction.onClick}
              disabled={cancelAction.disabled}
              color="var(--color-primary2)"
              className="flex-1 sm:flex-none"
            >
              {cancelAction.label || "Cancel"}
            </Button>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              disabled={action.disabled}
              className="flex-1 sm:flex-none"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
