/**
 * Vendor Restore Modal Component
 * Beautiful modal for restoring archived vendors with product selection options
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  RotateCcw,
  Building2,
  Package,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  PackageCheck,
  PackageX,
} from "lucide-react";
import {
  RestoreVendorDto,
  ArchivedVendorProduct,
  Vendor,
} from "../../services/vendors/types/vendor.types";

interface VendorRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RestoreVendorDto) => void;
  vendor: Vendor | null;
  isLoading?: boolean;
}

export const VendorRestoreModal: React.FC<VendorRestoreModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  vendor,
  isLoading = false,
}) => {
  // State for product restoration options
  const [restoreOption, setRestoreOption] = useState<"none" | "all" | "select">("none");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showProducts, setShowProducts] = useState(false);

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
      setRestoreOption("none");
      setSelectedProducts([]);
      setShowProducts(false);
    }
  }, [isOpen]);

  const displayVendor = vendor || lastVendorRef.current;

  if (!displayVendor) return null;

  const archivedProducts = displayVendor.archivedProducts || [];
  const hasArchivedProducts = archivedProducts.length > 0;

  // Handle confirm
  const handleConfirm = () => {
    const data: RestoreVendorDto = {};
    if (restoreOption === "all") {
      data.restoreAllProducts = true;
    } else if (restoreOption === "select" && selectedProducts.length > 0) {
      data.product_ids = selectedProducts;
    }
    onConfirm(data);
  };

  // Product selection handlers
  const handleProductToggle = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === archivedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(archivedProducts.map((p) => p.id));
    }
  };

  const isConfirmDisabled =
    isLoading || (restoreOption === "select" && selectedProducts.length === 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      {/* Header Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-green-100 to-emerald-100 shadow-sm">
        <RotateCcw className="w-7 h-7 text-green-600" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Restore Vendor</h2>
        <p className="text-sm text-gray-500 mt-1">
          Bring this vendor back to active status
        </p>
      </div>

      {/* Vendor Info Card */}
      <div className="w-full flex items-center gap-4 p-4 bg-linear-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
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
          <div className="w-14 h-14 rounded-xl bg-linear-to-br from-primary/10 to-primary/20 flex items-center justify-center border-2 border-white shadow-sm">
            <Building2 className="w-6 h-6 text-primary" />
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

      {/* Product Restoration Options */}
      {!hasArchivedProducts ? (
        <div className="w-full flex items-center gap-3 p-4 bg-blue-50/80 rounded-xl border border-blue-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">No archived products</p>
            <p className="text-xs text-blue-600 mt-0.5">
              This vendor has no archived products to restore.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Archived Products
            </span>
            <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              {archivedProducts.length} product{archivedProducts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Restore Options */}
          <div className="space-y-2">
            {/* Option: Don't restore products */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                restoreOption === "none"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="restoreOption"
                checked={restoreOption === "none"}
                onChange={() => setRestoreOption("none")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  restoreOption === "none"
                    ? "border-primary bg-primary"
                    : "border-gray-300"
                }`}
              >
                {restoreOption === "none" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <PackageX className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Don&apos;t restore any products
              </span>
            </label>

            {/* Option: Restore all products */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                restoreOption === "all"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="restoreOption"
                checked={restoreOption === "all"}
                onChange={() => setRestoreOption("all")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  restoreOption === "all"
                    ? "border-green-500 bg-green-500"
                    : "border-gray-300"
                }`}
              >
                {restoreOption === "all" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <Sparkles className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Restore all products
                </span>
                <span className="ml-2 text-xs text-green-600 font-medium">
                  ({archivedProducts.length})
                </span>
              </div>
            </label>

            {/* Option: Select specific products */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                restoreOption === "select"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="restoreOption"
                checked={restoreOption === "select"}
                onChange={() => {
                  setRestoreOption("select");
                  setShowProducts(true);
                }}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  restoreOption === "select"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {restoreOption === "select" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <PackageCheck className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                Select specific products
              </span>
            </label>
          </div>

          {/* Product Selection List */}
          {restoreOption === "select" && (
            <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowProducts(!showProducts)}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <span className="text-sm font-medium text-blue-700">
                  {selectedProducts.length} of {archivedProducts.length} selected
                </span>
                {showProducts ? (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-blue-600" />
                )}
              </button>

              {showProducts && (
                <div className="max-h-64 overflow-y-auto">
                  {/* Select All */}
                  <div className="flex items-center gap-3 p-3 border-b border-blue-100 bg-blue-50/50">
                    <Checkbox
                      checked={
                        selectedProducts.length === archivedProducts.length &&
                        archivedProducts.length > 0
                      }
                      onChange={handleSelectAll}
                      label="Select All"
                    />
                  </div>

                  {archivedProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductToggle(product.id)}
                      className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-all ${
                        selectedProducts.includes(product.id)
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleProductToggle(product.id)}
                      />
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name_en}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-gray-800">
                          {product.name_en}
                        </div>
                        {product.sku && (
                          <div className="text-xs text-gray-500">
                            SKU: {product.sku}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {!hasArchivedProducts && (
        <div className="w-full p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-700 text-center">
            The vendor will be restored and made active again.
          </p>
        </div>
      )}

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
          disabled={isConfirmDisabled}
          color="var(--color-success)"
          className="flex-1"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Restoring...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Restore Vendor
            </span>
          )}
        </Button>
      </div>
    </Modal>
  );
};
