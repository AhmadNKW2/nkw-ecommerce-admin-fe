/**
 * Vendor Delete Modal Component
 * Beautiful modal for permanently deleting vendors with product handling options
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectOption } from "../ui/select";
import {
  Trash2,
  Building2,
  AlertTriangle,
  Package,
  ArrowRightLeft,
  Flame,
  ShieldAlert,
} from "lucide-react";
import {
  PermanentDeleteVendorDto,
  Vendor,
} from "../../services/vendors/types/vendor.types";

interface VendorDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PermanentDeleteVendorDto) => void;
  vendor: Vendor | null;
  allVendors?: Vendor[];
  isLoading?: boolean;
}

export const VendorDeleteModal: React.FC<VendorDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  vendor,
  allVendors = [],
  isLoading = false,
}) => {
  // State for deletion options
  const [productOption, setProductOption] = useState<"delete" | "move">("delete");
  const [targetVendorId, setTargetVendorId] = useState<string>("");
  const [confirmInput, setConfirmInput] = useState("");
  const CONFIRM_WORD = "delete";

  // Keep the last valid vendor for closing animation
  const lastVendorRef = useRef(vendor);

  useEffect(() => {
    if (vendor) {
      lastVendorRef.current = vendor;
    }
  }, [vendor]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setProductOption("delete");
      setTargetVendorId("");
      setConfirmInput("");
    }
  }, [isOpen]);

  const displayVendor = vendor || lastVendorRef.current;

  if (!displayVendor) return null;

  const archivedProducts = displayVendor.archivedProducts || [];
  const hasArchivedProducts = archivedProducts.length > 0;

  // Filter out current vendor from the list
  const availableVendors = allVendors.filter(
    (v) => v.id !== displayVendor.id && v.status !== "archived"
  );

  const vendorOptions: SelectOption[] = availableVendors.map((v) => ({
    value: v.id.toString(),
    label: v.name_en,
  }));

  const isConfirmValid = confirmInput.toLowerCase() === CONFIRM_WORD;

  // Handle confirm
  const handleConfirm = () => {
    if (!isConfirmValid) return;

    const data: PermanentDeleteVendorDto = {};
    if (hasArchivedProducts) {
      if (productOption === "delete") {
        data.deleteProducts = true;
      } else if (productOption === "move" && targetVendorId) {
        data.moveProductsToVendorId = parseInt(targetVendorId);
      }
    }
    onConfirm(data);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isConfirmValid && !isLoading) {
      handleConfirm();
    }
  };

  const isButtonDisabled =
    isLoading ||
    !isConfirmValid ||
    (hasArchivedProducts && productOption === "move" && !targetVendorId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      {/* Header Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-red-100 to-red-200 shadow-sm">
        <Trash2 className="w-7 h-7 text-red-600" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Permanently Delete Vendor
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          This action cannot be undone
        </p>
      </div>

      {/* Vendor Info Card */}
      <div className="w-full flex items-center gap-4 p-4 bg-linear-to-r from-red-50 to-red-100/50 rounded-xl border border-red-200">
        {displayVendor.logo ? (
          <div className="w-14 h-14 relative rounded-xl overflow-hidden border-2 border-white shadow-sm">
            <Image
              src={displayVendor.logo}
              alt={displayVendor.name_en}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-linear-to-br from-red-100 to-red-200 flex items-center justify-center border-2 border-white shadow-sm">
            <Building2 className="w-6 h-6 text-red-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {displayVendor.name_en}
          </div>
          {displayVendor.name_ar && (
            <div className="text-sm text-gray-500 truncate" dir="rtl">
              {displayVendor.name_ar}
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      <div className="w-full flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800">Permanent Action</p>
          <p className="text-xs text-amber-700 mt-0.5">
            This will permanently delete the vendor and all its data.
            {hasArchivedProducts &&
              ` There are ${archivedProducts.length} archived product(s) that need to be handled.`}
          </p>
        </div>
      </div>

      {/* Product Handling Options */}
      {hasArchivedProducts && (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Handle Archived Products
            </span>
            <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {archivedProducts.length} product{archivedProducts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {/* Option: Delete products */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                productOption === "delete"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="productOption"
                checked={productOption === "delete"}
                onChange={() => setProductOption("delete")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  productOption === "delete"
                    ? "border-red-500 bg-red-500"
                    : "border-gray-300"
                }`}
              >
                {productOption === "delete" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <Flame className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Delete all products permanently
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  All {archivedProducts.length} products will be deleted forever
                </p>
              </div>
            </label>

            {/* Option: Move products */}
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                productOption === "move"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="productOption"
                checked={productOption === "move"}
                onChange={() => setProductOption("move")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                  productOption === "move"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {productOption === "move" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <ArrowRightLeft className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Move products to another vendor
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Products will be reassigned before deletion
                </p>

                {/* Vendor Selection */}
                {productOption === "move" && (
                  <div className="mt-3" onClick={(e) => e.preventDefault()}>
                    <Select
                      label="Select Target Vendor"
                      value={targetVendorId}
                      onChange={(value) => setTargetVendorId(value as string)}
                      options={vendorOptions}
                      placeholder="Choose a vendor..."
                    />
                    {vendorOptions.length === 0 && (
                      <p className="text-xs text-amber-600 mt-2">
                        No active vendors available to move products to.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Confirmation Input */}
      <div className="w-full space-y-3">
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            Type{" "}
            <span className="inline-block font-mono bg-red-100 border border-red-200 px-1.5 py-0.5 rounded text-red-700 font-semibold select-all">
              {CONFIRM_WORD}
            </span>{" "}
            to confirm permanent deletion
          </p>
        </div>
        <Input
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type here to confirm..."
          className={`${
            confirmInput && !isConfirmValid
              ? "border-red-300 focus:border-red-500"
              : confirmInput && isConfirmValid
              ? "border-green-400 focus:border-green-500"
              : ""
          }`}
        />
        {confirmInput && !isConfirmValid && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Please type &quot;{CONFIRM_WORD}&quot; exactly to enable deletion
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 w-full pt-2 justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={isButtonDisabled}
          color="var(--color-danger)"
          className="flex-1"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Deleting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Permanently
            </span>
          )}
        </Button>
      </div>
    </Modal>
  );
};
