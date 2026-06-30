/**
 * Category Restore Modal Component
 * Beautiful modal for restoring archived categories with nested subcategory/product selection
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Select, SelectOption } from "../ui/select";
import {
  RotateCcw,
  Folder,
  Package,
  ChevronDown,
  ChevronRight,
  Info,
  Sparkles,
  FolderTree,
  PackageCheck,
  PackageX,
  FolderOpen,
  ArrowRight,
  Home,
  Layers,
} from "lucide-react";
import {
  RestoreCategoryDto,
  ProductRestoreOptions,
  ArchivedCategoryProduct,
  ArchivedSubcategory,
  Category,
} from "../../services/categories/types/category.types";

interface CategoryRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RestoreCategoryDto) => void;
  category: Category | null;
  allCategories?: Category[];
  isLoading?: boolean;
}

// SubcategoryItem component for recursive rendering
interface SubcategoryItemProps {
  subcategory: ArchivedSubcategory;
  selected: boolean;
  onToggle: () => void;
}

const SubcategoryItem: React.FC<SubcategoryItemProps> = ({
  subcategory,
  selected,
  onToggle,
}) => {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-all ${
        selected ? "bg-purple-50" : "hover:bg-gray-50"
      }`}
    >
      <Checkbox checked={selected} onChange={onToggle} />
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
        {subcategory.image ? (
          <img
            src={subcategory.image}
            alt={subcategory.name_en}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Folder className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate text-gray-800">
          {subcategory.name_en}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
          {subcategory.archivedProductsCount > 0 && (
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {subcategory.archivedProductsCount} products
            </span>
          )}
          {subcategory.archivedSubcategoriesCount > 0 && (
            <span className="flex items-center gap-1">
              <FolderTree className="w-3 h-3" />
              {subcategory.archivedSubcategoriesCount} subcategories
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const CategoryRestoreModal: React.FC<CategoryRestoreModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  category,
  allCategories = [],
  isLoading = false,
}) => {
  // Parent options state
  const [parentOption, setParentOption] = useState<"original" | "root" | "new">("original");
  const [newParentId, setNewParentId] = useState<string>("");

  // Product restoration state
  const [productOption, setProductOption] = useState<"none" | "all" | "select">("none");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  // Subcategory restoration state
  const [subcategoryOption, setSubcategoryOption] = useState<"none" | "all" | "select">("none");
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  const [showSubcategories, setShowSubcategories] = useState(false);

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
      setParentOption("original");
      setNewParentId("");
      setProductOption("none");
      setSelectedProducts([]);
      setShowProducts(false);
      setSubcategoryOption("none");
      setSelectedSubcategories([]);
      setShowSubcategories(false);
    }
  }, [isOpen]);

  const displayCategory = category || lastCategoryRef.current;

  if (!displayCategory) return null;

  const archivedProducts = displayCategory.archivedProducts || [];
  const archivedSubcategories = displayCategory.archivedSubcategories || [];
  const hasArchivedProducts = archivedProducts.length > 0;
  const hasArchivedSubcategories = archivedSubcategories.length > 0;

  // Filter out current category and its children from the parent options
  const availableParents = allCategories.filter(
    (c) => c.id !== displayCategory.id && c.status !== "archived"
  );

  const parentOptions: SelectOption[] = availableParents.map((c) => ({
    value: c.id.toString(),
    label: c.name_en,
  }));

  // Handle confirm
  const handleConfirm = () => {
    const data: RestoreCategoryDto = {};

    // Parent handling
    if (parentOption === "root") {
      data.makeRoot = true;
    } else if (parentOption === "new" && newParentId) {
      data.new_parent_id = parseInt(newParentId);
    }

    // Product restoration
    if (hasArchivedProducts) {
      data.products = {};
      if (productOption === "all") {
        data.products.restoreAll = true;
      } else if (productOption === "select" && selectedProducts.length > 0) {
        data.products.product_ids = selectedProducts;
      }
    }

    // Subcategory restoration
    if (hasArchivedSubcategories) {
      if (subcategoryOption === "all") {
        data.restoreAllSubcategories = true;
      } else if (subcategoryOption === "select" && selectedSubcategories.length > 0) {
        data.subcategories = selectedSubcategories.map((id) => ({
          id,
          products: { restoreAll: true },
          restoreAllSubcategories: true,
        }));
      }
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

  const handleSelectAllProducts = () => {
    if (selectedProducts.length === archivedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(archivedProducts.map((p) => p.id));
    }
  };

  // Subcategory selection handlers
  const handleSubcategoryToggle = (subcategoryId: number) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcategoryId)
        ? prev.filter((id) => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const handleSelectAllSubcategories = () => {
    if (selectedSubcategories.length === archivedSubcategories.length) {
      setSelectedSubcategories([]);
    } else {
      setSelectedSubcategories(archivedSubcategories.map((s) => s.id));
    }
  };

  const isConfirmDisabled =
    isLoading ||
    (productOption === "select" && selectedProducts.length === 0 && hasArchivedProducts && subcategoryOption === "none") ||
    (subcategoryOption === "select" && selectedSubcategories.length === 0 && hasArchivedSubcategories && productOption === "none") ||
    (parentOption === "new" && !newParentId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header Icon */}
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-green-100 to-emerald-100 shadow-sm">
        <RotateCcw className="w-7 h-7 text-green-600" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Restore Category</h2>
        <p className="text-sm text-gray-500 mt-1">
          Choose how to restore this category and its contents
        </p>
      </div>

      {/* Category Info Card */}
      <div className="w-full flex items-center gap-4 p-4 bg-linear-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
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
          <div className="w-14 h-14 rounded-xl bg-linear-to-br from-primary/10 to-primary/20 flex items-center justify-center border-2 border-white shadow-sm">
            <Folder className="w-6 h-6 text-primary" />
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
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            {hasArchivedProducts && (
              <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                <Package className="w-3 h-3" />
                {archivedProducts.length} products
              </span>
            )}
            {hasArchivedSubcategories && (
              <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                <FolderTree className="w-3 h-3" />
                {archivedSubcategories.length} subcategories
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Parent Category Options */}
      <div className="w-full space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            Parent Category
          </span>
        </div>

        <div className="space-y-2">
          {/* Option: Keep original parent */}
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              parentOption === "original"
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="parentOption"
              checked={parentOption === "original"}
              onChange={() => setParentOption("original")}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                parentOption === "original"
                  ? "border-primary bg-primary"
                  : "border-gray-300"
              }`}
            >
              {parentOption === "original" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <Folder className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">
              Keep original parent (if exists)
            </span>
          </label>

          {/* Option: Make root category */}
          <label
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              parentOption === "root"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="parentOption"
              checked={parentOption === "root"}
              onChange={() => setParentOption("root")}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                parentOption === "root"
                  ? "border-green-500 bg-green-500"
                  : "border-gray-300"
              }`}
            >
              {parentOption === "root" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <Home className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              Make a root category (no parent)
            </span>
          </label>

          {/* Option: Assign new parent */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              parentOption === "new"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="parentOption"
              checked={parentOption === "new"}
              onChange={() => setParentOption("new")}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                parentOption === "new"
                  ? "border-blue-500 bg-blue-500"
                  : "border-gray-300"
              }`}
            >
              {parentOption === "new" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <ArrowRight className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">
                Move to a different parent
              </span>

              {/* Parent Selection */}
              {parentOption === "new" && (
                <div className="mt-3" onClick={(e) => e.preventDefault()}>
                  <Select
                    label="Select New Parent"
                    value={newParentId}
                    onChange={(value) => setNewParentId(value as string)}
                    options={parentOptions}
                    placeholder="Choose a parent category..."
                  />
                </div>
              )}
            </div>
          </label>
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
              This category has no archived products to restore.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-700">
                Archived Products
              </span>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
              {archivedProducts.length} product{archivedProducts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Product Options */}
          <div className="space-y-2">
            {/* Option: Don't restore products */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                productOption === "none"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="productOption"
                checked={productOption === "none"}
                onChange={() => setProductOption("none")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  productOption === "none"
                    ? "border-primary bg-primary"
                    : "border-gray-300"
                }`}
              >
                {productOption === "none" && (
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
                productOption === "all"
                  ? "border-amber-500 bg-amber-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="productOption"
                checked={productOption === "all"}
                onChange={() => setProductOption("all")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  productOption === "all"
                    ? "border-amber-500 bg-amber-500"
                    : "border-gray-300"
                }`}
              >
                {productOption === "all" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <Sparkles className="w-5 h-5 text-amber-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Restore all products
                </span>
                <span className="ml-2 text-xs text-amber-600 font-medium">
                  ({archivedProducts.length})
                </span>
              </div>
            </label>

            {/* Option: Select specific products */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                productOption === "select"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="productOption"
                checked={productOption === "select"}
                onChange={() => {
                  setProductOption("select");
                  setShowProducts(true);
                }}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  productOption === "select"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {productOption === "select" && (
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
          {productOption === "select" && (
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
                <div className="max-h-48 overflow-y-auto">
                  {/* Select All */}
                  <div className="flex items-center gap-3 p-3 border-b border-blue-100 bg-blue-50/50">
                    <Checkbox
                      checked={
                        selectedProducts.length === archivedProducts.length &&
                        archivedProducts.length > 0
                      }
                      onChange={handleSelectAllProducts}
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

      {/* Subcategory Restoration Options */}
      {!hasArchivedSubcategories ? (
        <div className="w-full flex items-center gap-3 p-4 bg-purple-50/80 rounded-xl border border-purple-100">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-800">No archived subcategories</p>
            <p className="text-xs text-purple-600 mt-0.5">
              This category has no archived subcategories to restore.
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-semibold text-gray-700">
                Archived Subcategories
              </span>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              {archivedSubcategories.length} subcategor{archivedSubcategories.length !== 1 ? "ies" : "y"}
            </span>
          </div>

          {/* Subcategory Options */}
          <div className="space-y-2">
            {/* Option: Don't restore subcategories */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                subcategoryOption === "none"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="subcategoryOption"
                checked={subcategoryOption === "none"}
                onChange={() => setSubcategoryOption("none")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  subcategoryOption === "none"
                    ? "border-primary bg-primary"
                    : "border-gray-300"
                }`}
              >
                {subcategoryOption === "none" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <Folder className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Don&apos;t restore any subcategories
              </span>
            </label>

            {/* Option: Restore all subcategories */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                subcategoryOption === "all"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="subcategoryOption"
                checked={subcategoryOption === "all"}
                onChange={() => setSubcategoryOption("all")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  subcategoryOption === "all"
                    ? "border-purple-500 bg-purple-500"
                    : "border-gray-300"
                }`}
              >
                {subcategoryOption === "all" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <Sparkles className="w-5 h-5 text-purple-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Restore all subcategories with their products
                </span>
                <span className="ml-2 text-xs text-purple-600 font-medium">
                  ({archivedSubcategories.length})
                </span>
              </div>
            </label>

            {/* Option: Select specific subcategories */}
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                subcategoryOption === "select"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="subcategoryOption"
                checked={subcategoryOption === "select"}
                onChange={() => {
                  setSubcategoryOption("select");
                  setShowSubcategories(true);
                }}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  subcategoryOption === "select"
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {subcategoryOption === "select" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <FolderOpen className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                Select specific subcategories
              </span>
            </label>
          </div>

          {/* Subcategory Selection List */}
          {subcategoryOption === "select" && (
            <div className="border-2 border-purple-200 rounded-xl overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setShowSubcategories(!showSubcategories)}
                className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                <span className="text-sm font-medium text-purple-700">
                  {selectedSubcategories.length} of {archivedSubcategories.length} selected
                </span>
                {showSubcategories ? (
                  <ChevronDown className="w-5 h-5 text-purple-600" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-purple-600" />
                )}
              </button>

              {showSubcategories && (
                <div className="max-h-48 overflow-y-auto">
                  {/* Select All */}
                  <div className="flex items-center gap-3 p-3 border-b border-purple-100 bg-purple-50/50">
                    <Checkbox
                      checked={
                        selectedSubcategories.length === archivedSubcategories.length &&
                        archivedSubcategories.length > 0
                      }
                      onChange={handleSelectAllSubcategories}
                      label="Select All"
                    />
                  </div>

                  {archivedSubcategories.map((subcategory) => (
                    <SubcategoryItem
                      key={subcategory.id}
                      subcategory={subcategory}
                      selected={selectedSubcategories.includes(subcategory.id)}
                      onToggle={() => handleSubcategoryToggle(subcategory.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-3 w-full pt-4 border-t border-gray-100 justify-center">
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
              Restore Category
            </span>
          )}
        </Button>
      </div>
    </Modal>
  );
};
