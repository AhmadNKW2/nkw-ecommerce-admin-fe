/**
 * Delete Confirmation Modal Component
 * Reusable modal for confirming delete actions
 * Supports permanent deletion with "type to confirm" functionality
 */

"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AlertTriangle, CheckCircle, Trash2 } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "success";
  isPermanent?: boolean;
}

export const DeleteConfirmationModal: React.FC<
  DeleteConfirmationModalProps
> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  itemName,
  isLoading = false,
  confirmText = "Delete",
  cancelText = "Cancel",
  confirmVariant = "danger",
  isPermanent = false,
}) => {
    const [confirmInput, setConfirmInput] = useState("");
    const CONFIRM_WORD = "delete";
    const isConfirmValid = confirmInput.toLowerCase() === CONFIRM_WORD;

    const isDanger = confirmVariant === "danger";
    const iconBgColor = isDanger ? "bg-red-100" : "bg-green-100";
    const iconColor = isDanger ? "text-red-600" : "text-green-600";
    const buttonColor = isDanger ? "var(--color-danger)" : "var(--color-success)";
    const Icon = isDanger ? (isPermanent ? Trash2 : AlertTriangle) : CheckCircle;

    // Reset input when modal opens/closes
    useEffect(() => {
      if (isOpen) {
        setConfirmInput("");
      }
    }, [isOpen]);

    const handleConfirm = () => {
      if (isPermanent && !isConfirmValid) return;
      onConfirm();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && isConfirmValid && !isLoading) {
        handleConfirm();
      }
    };

    const isButtonDisabled = isLoading || (isPermanent && !isConfirmValid);

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        variant="default"
        className="max-w-lg w-full"
        contentClassName="gap-4"
      >
        <div className={`flex items-center justify-center w-12 h-12 ${iconBgColor} rounded-full`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>

        <p className="text-sm font-medium text-red-800 text-center bg-red-50 p-3 border border-red-200 rounded-lg w-full">
          {message}
          {itemName && (
            <>
              {" "}
              <span className="font-semibold">&quot;{itemName}&quot;</span>
            </>
          )}
        </p>

        {isPermanent && (
          <div className="w-full space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Type{" "}
              <span className="inline-block font-mono bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-red-600 select-all">
                {CONFIRM_WORD}
              </span>
              {" "}to confirm:
            </label>
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={CONFIRM_WORD}
              autoFocus
              className={`${confirmInput && !isConfirmValid
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : confirmInput && isConfirmValid
                  ? "border-green-300 focus:border-green-500 focus:ring-green-500"
                  : ""
                }`}
            />
            {confirmInput && !isConfirmValid && (
              <p className="text-xs text-red-500">
                Please type &quot;{CONFIRM_WORD}&quot; exactly to enable deletion
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 w-full justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            color="var(--color-danger)"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isButtonDisabled}
            color={buttonColor}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isPermanent ? "Deleting..." : confirmText}
              </span>
            ) : (
              isPermanent ? (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {confirmText}
                </span>
              ) : confirmText
            )}
          </Button>
        </div>
      </Modal>
    );
  };
