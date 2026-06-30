/**
 * Category Delete Modal Component
 * Beautiful modal for permanently deleting categories with product handling options
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
  Folder,
  AlertTriangle,
  Package,
  ArrowRightLeft,
  Flame,
  ShieldAlert,
  FolderTree,
} from "lucide-react";
import {
  PermanentDeleteCategoryDto,
  Category,
} from "../../services/categories/types/category.types";

interface CategoryDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: PermanentDeleteCategoryDto) => void;
  category: Category | null;
  allCategories?: Category[];
  isLoading?: boolean;
}

export const CategoryDeleteModal: React.FC<CategoryDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  category,
  allCategories = [],
  isLoading = false,
}) => {
  // State for deletion options
  const [productOption, setProductOption] = useState<"delete" | "move">("delete");
  const [targetCategoryId, setTargetCategoryId] = useState<string>("");
  const [confirmInput, setConfirmInput] = useState("");
  const CONFIRM_WORD = "delete";

  // Keep the last valid category for closing animation
  const lastCategoryRef = useRef(category);

  useEffect(() => {
    if (category) {
      lastCategoryRef.current = category;
    }
  }, [category]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setProductOption("delete");
      setTargetCategoryId("");
      setConfirmInput("");
    }
  }, [isOpen]);

  const displayCategory = category || lastCategoryRef.current;

  if (!displayCategory) return null;

  const archivedProducts = displayCategory.archivedProducts || [];
  const archivedSubcategories = displayCategory.archivedSubcategories || [];
  const hasArchivedProducts = archivedProducts.length > 0;
  const hasArchivedSubcategories = archivedSubcategories.length > 0;

  // Count total products (including from subcategories)
  const subcategoryProductCount = archivedSubcategories.reduce(
    (sum, sub) => sum + (sub.archivedProductsCount || 0),
    0
  );
  const totalProductCount = archivedProducts.length + subcategoryProductCount;

  // Filter out current category and its children from the list
  const availableCategories = allCategories.filter(
    (c) => c.id !== displayCategory.id && c.status !== "archived"
  );

  const categoryOptions: SelectOption[] = availableCategories.map((c) => ({
    value: c.id.toString(),
    label: c.name_en,
  }));

  const isConfirmValid = confirmInput.toLowerCase() === CONFIRM_WORD;

  // Handle confirm
  const handleConfirm = () => {
    if (!isConfirmValid) return;

    const data: PermanentDeleteCategoryDto = {};
    if (totalProductCount > 0) {
      if (productOption === "delete") {
        data.deleteProducts = true;
      } else if (productOption === "move" && targetCategoryId) {
        data.move_products_to_category_id = parseInt(targetCategoryId);
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
    (totalProductCount > 0 && productOption === "move" && !targetCategoryId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      {/* Header Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-red-100 to-red-200 shadow-sm">
        <Trash2 className="w-7 h-7 text-red-600" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Permanently Delete Category
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          This action cannot be undone
        </p>
      </div>

      {/* Category Info Card */}
      <div className="w-full flex items-center gap-4 p-4 bg-linear-to-r from-red-50 to-red-100/50 rounded-xl border border-red-200">
        {displayCategory.image ? (
          <div className="w-14 h-14 relative rounded-xl overflow-hidden border-2 border-white shadow-sm">
            <Image
              src={displayCategory.image}
              alt={displayCategory.name_en}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-linear-to-br from-red-100 to-red-200 flex items-center justify-center border-2 border-white shadow-sm">
            <Folder className="w-6 h-6 text-red-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {displayCategory.name_en}
          </div>
          {displayCategory.name_ar && (
            <div className="text-sm text-gray-500 truncate" dir="rtl">
              {displayCategory.name_ar}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            {hasArchivedProducts && (
              <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                <Package className="w-3 h-3" />
                {archivedProducts.length} products
              </span>
            )}
            {hasArchivedSubcategories && (
              <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                <FolderTree className="w-3 h-3" />
                {archivedSubcategories.length} subcategories
              </span>
            )}
          </div>
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
            This will permanently delete the category
            {hasArchivedSubcategories && `, all ${archivedSubcategories.length} subcategories`}
            {totalProductCount > 0 && ` and handle ${totalProductCount} product(s)`}.
          </p>
        </div>
      </div>

      {/* Product Handling Options */}
      {totalProductCount > 0 && (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Handle Products
            </span>
            <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {totalProductCount} total product{totalProductCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Info about product sources */}
          {hasArchivedProducts && subcategoryProductCount > 0 && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
              <Package className="w-4 h-4" />
              <span>
                {archivedProducts.length} from this category + {subcategoryProductCount} from subcategories
              </span>
            </div>
          )}

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
                  All {totalProductCount} products will be deleted forever
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
                  Move products to another category
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Products will be reassigned before deletion
                </p>

                {/* Category Selection */}
                {productOption === "move" && (
                  <div className="mt-3" onClick={(e) => e.preventDefault()}>
                    <Select
                      label="Select Target Category"
                      value={targetCategoryId}
                      onChange={(value) => setTargetCategoryId(value as string)}
                      options={categoryOptions}
                      placeholder="Choose a category..."
                    />
                    {categoryOptions.length === 0 && (
                      <p className="text-xs text-amber-600 mt-2">
                        No active categories available to move products to.
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
