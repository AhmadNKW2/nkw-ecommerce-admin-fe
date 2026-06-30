/**
 * Restore Confirmation Modal Component
 * Unified modal for restoring archived products, categories, and vendors
 */

"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { 
  RotateCcw, 
  Package, 
  Building2,
  Folder,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info
} from "lucide-react";
import { RestoreVendorDto, ArchivedVendorProduct } from "../../services/vendors/types/vendor.types";

// Base item interface
interface BaseItem {
  id: number;
  name_en: string;
  name_ar?: string;
}

// Product item
interface ProductItem extends BaseItem {
  sku?: string;
  image?: string | null;
  primary_image?: { url: string; alt_text?: string | null } | null;
  vendor?: {
    name?: string;
    name_en?: string;
    name_ar?: string;
    logo?: string | null;
    status?: "active" | "archived";
  } | null;
  category?: {
    name?: string;
    name_en?: string;
    name_ar?: string;
    image?: string | null;
    status?: "active" | "archived";
  } | null;
}

// Category item
interface CategoryItem extends BaseItem {
  image?: string | null;
}

// Vendor item with archived products
interface VendorItem extends BaseItem {
  logo?: string | null;
  archivedProducts?: ArchivedVendorProduct[];
}

// Props for different variants
interface ProductRestoreProps {
  variant: "product";
  item: ProductItem | null;
  onConfirm: () => void;
}

interface CategoryRestoreProps {
  variant: "category";
  item: CategoryItem | null;
  onConfirm: () => void;
}

interface VendorRestoreProps {
  variant: "vendor";
  item: VendorItem | null;
  onConfirm: (data: RestoreVendorDto) => void;
}

type RestoreConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
} & (ProductRestoreProps | CategoryRestoreProps | VendorRestoreProps);

export const RestoreConfirmationModal: React.FC<RestoreConfirmationModalProps> = (props) => {
  const { isOpen, onClose, isLoading = false, variant, item, onConfirm } = props;

  // State for vendor product restoration
  const [restoreOption, setRestoreOption] = useState<"none" | "all" | "select">("none");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  // Keep the last valid item in a ref so we can show it during closing animation
  const lastItemRef = useRef(item);
  
  useEffect(() => {
    if (item) {
      lastItemRef.current = item;
    }
  }, [item]);

  // Reset vendor state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setRestoreOption("none");
      setSelectedProducts([]);
      setShowProducts(false);
    }
  }, [isOpen]);

  // Use current item if available, otherwise use the last valid item for closing animation
  const displayItem = item || lastItemRef.current;

  if (!displayItem) return null;

  // Handle confirm based on variant
  const handleConfirm = () => {
    if (variant === "vendor") {
      const data: RestoreVendorDto = {};
      if (restoreOption === "all") {
        data.restoreAllProducts = true;
      } else if (restoreOption === "select" && selectedProducts.length > 0) {
        data.product_ids = selectedProducts;
      }
      (onConfirm as (data: RestoreVendorDto) => void)(data);
    } else {
      (onConfirm as () => void)();
    }
  };

  // Vendor product selection handlers
  const handleProductToggle = (product_id: number) => {
    setSelectedProducts(prev => 
      prev.includes(product_id)
        ? prev.filter(id => id !== product_id)
        : [...prev, product_id]
    );
  };

  const handleSelectAll = (archivedProducts: ArchivedVendorProduct[]) => {
    if (selectedProducts.length === archivedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(archivedProducts.map(p => p.id));
    }
  };

  // Get variant-specific configuration
  const getVariantConfig = () => {
    switch (variant) {
      case "product":
        const productItem = displayItem as ProductItem;
        const isVendorArchived = productItem.vendor?.status === "archived";
        const isCategoryArchived = productItem.category?.status === "archived";
        const canRestore = !isVendorArchived && !isCategoryArchived;
        const productImage = productItem.image || productItem.primary_image?.url;
        
        // Determine title based on what's blocking restoration
        let productTitle = "Restore Product";
        if (isVendorArchived && isCategoryArchived) {
          productTitle = "Cannot Restore Product";
        } else if (isVendorArchived) {
          productTitle = "Cannot Restore Product";
        } else if (isCategoryArchived) {
          productTitle = "Cannot Restore Product";
        }
        
        return {
          title: productTitle,
          icon: <Package className="w-5 h-5 text-primary" />,
          image: productImage,
          imageAlt: productItem.primary_image?.alt_text || productItem.name_en,
          canRestore,
          confirmText: "Restore Product",
          successMessage: "Are you sure you want to restore this product? This will make the product active again.",
          extraContent: !canRestore ? (
            <ProductBlockedWarning 
              vendor={isVendorArchived ? productItem.vendor! : undefined} 
              category={isCategoryArchived ? productItem.category! : undefined}
            />
          ) : null,
          sku: productItem.sku,
          confirmDisabled: false,
        };
      case "category":
        const categoryItem = displayItem as CategoryItem;
        return {
          title: "Restore Category",
          icon: <Folder className="w-5 h-5 text-primary" />,
          image: categoryItem.image,
          imageAlt: categoryItem.name_en,
          canRestore: true,
          confirmText: "Restore Category",
          successMessage: "Are you sure you want to restore this category? This will make the category active again.",
          extraContent: null,
          sku: undefined,
          confirmDisabled: false,
        };
      case "vendor":
        const vendorItem = displayItem as VendorItem;
        const archivedProducts = vendorItem.archivedProducts || [];
        const hasArchivedProducts = archivedProducts.length > 0;
        return {
          title: "Restore Vendor",
          icon: <Building2 className="w-5 h-5 text-primary" />,
          image: vendorItem.logo,
          imageAlt: vendorItem.name_en,
          canRestore: true,
          confirmText: "Restore Vendor",
          successMessage: !hasArchivedProducts ? "Are you sure you want to restore this vendor? This will make the vendor active again." : undefined,
          extraContent: (
            <VendorProductSelection
              archivedProducts={archivedProducts}
              restoreOption={restoreOption}
              setRestoreOption={setRestoreOption}
              selectedProducts={selectedProducts}
              showProducts={showProducts}
              setShowProducts={setShowProducts}
              handleProductToggle={handleProductToggle}
              handleSelectAll={() => handleSelectAll(archivedProducts)}
            />
          ),
          sku: undefined,
          confirmDisabled: restoreOption === "select" && selectedProducts.length === 0,
        };
    }
  };

  const config = getVariantConfig();

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full">
      {/* Header Icon */}
      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
        config.canRestore ? "bg-green-100" : "bg-amber-100"
      }`}>
        {config.canRestore ? (
          <RotateCcw className="w-6 h-6 text-green-600" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        )}
      </div>
      
      <h2 className="text-xl font-semibold">{config.title}</h2>
      
      {/* Item Info */}
      <div className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        {config.image ? (
          <div className="w-12 h-12 relative rounded-lg overflow-hidden border border-gray-200">
            <Image
              src={config.image}
              alt={config.imageAlt}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {config.icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{displayItem.name_en}</div>
          {displayItem.name_ar && (
            <div className="text-sm text-gray-500 truncate" dir="rtl">{displayItem.name_ar}</div>
          )}
          {config.sku && (
            <div className="text-xs text-gray-400">SKU: {config.sku}</div>
          )}
        </div>
      </div>

      {/* Extra Content (e.g., Vendor Archived Warning, Product Selection) */}
      {config.extraContent}

      {/* Can Restore Message */}
      {config.canRestore && config.successMessage && (
        <p className="text-sm text-success bg-success/10 p-3 rounded-r1 border border-success/40 text-center">
          {config.successMessage}
        </p>
      )}

      {/* Footer */}
      <div className="flex gap-3 w-full justify-center">
        <Button
          type="button"
          variant="solid"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1"
          color="var(--color-danger)"
        >
          {config.canRestore ? "Cancel" : "Close"}
        </Button>
        {config.canRestore && (
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || config.confirmDisabled}
            color="var(--color-success)"
            className="flex-1"
          >
            {isLoading ? "Restoring..." : config.confirmText}
          </Button>
        )}
      </div>
    </Modal>
  );
};

// Vendor Product Selection Component
interface VendorProductSelectionProps {
  archivedProducts: ArchivedVendorProduct[];
  restoreOption: "none" | "all" | "select";
  setRestoreOption: (option: "none" | "all" | "select") => void;
  selectedProducts: number[];
  showProducts: boolean;
  setShowProducts: (show: boolean) => void;
  handleProductToggle: (id: number) => void;
  handleSelectAll: () => void;
}

const VendorProductSelection: React.FC<VendorProductSelectionProps> = ({
  archivedProducts,
  restoreOption,
  setRestoreOption,
  selectedProducts,
  showProducts,
  setShowProducts,
  handleProductToggle,
  handleSelectAll,
}) => {
  const productCount = archivedProducts.length;
  const hasArchivedProducts = productCount > 0;

  if (!hasArchivedProducts) {
    return (
      <div className="w-full flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
        <Info className="w-4 h-4 shrink-0" />
        <span>This vendor has no archived products to restore.</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <span className="text-sm font-medium text-gray-700">
        Archived Products ({productCount})
      </span>

      {/* Restore Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="radio"
            name="restoreOption"
            checked={restoreOption === "none"}
            onChange={() => setRestoreOption("none")}
            className="w-4 h-4 text-primary"
          />
          <span className="text-sm">Don&apos;t restore any products</span>
        </label>

        <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="radio"
            name="restoreOption"
            checked={restoreOption === "all"}
            onChange={() => setRestoreOption("all")}
            className="w-4 h-4 text-primary"
          />
          <span className="text-sm">
            Restore all products ({productCount})
          </span>
        </label>

        <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="radio"
            name="restoreOption"
            checked={restoreOption === "select"}
            onChange={() => {
              setRestoreOption("select");
              setShowProducts(true);
            }}
            className="w-4 h-4 text-primary"
          />
          <span className="text-sm">
            Select specific products
          </span>
        </label>
      </div>

      {/* Product Selection List */}
      {restoreOption === "select" && (
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowProducts(!showProducts)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium">
              {selectedProducts.length} product(s) selected
            </span>
            {showProducts ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {showProducts && (
            <div className="max-h-64 overflow-y-auto">
              {/* Select All */}
              <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
                <Checkbox
                  checked={selectedProducts.length === productCount && productCount > 0}
                  onChange={handleSelectAll}
                  label="Select All"
                />
              </div>

              {archivedProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50"
                >
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => handleProductToggle(product.id)}
                  />
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
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
                    <div className="text-sm font-medium truncate">{product.name_en}</div>
                    {product.sku && (
                      <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper component for product restoration blocked warning (vendor or category archived)
interface ProductBlockedWarningProps {
  vendor?: NonNullable<ProductItem["vendor"]>;
  category?: NonNullable<ProductItem["category"]>;
}

const ProductBlockedWarning: React.FC<ProductBlockedWarningProps> = ({ vendor, category }) => {
  const vendorNameEn = vendor?.name_en || vendor?.name || "Unknown Vendor";
  const vendorNameAr = vendor?.name_ar || "";
  const categoryNameEn = category?.name_en || category?.name || "Unknown Category";
  const categoryNameAr = category?.name_ar || "";
  
  const bothArchived = !!vendor && !!category;

  return (
    <div className="w-full space-y-3">
      {/* Warning Message */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <XCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-800">
            This product cannot be restored
          </p>
          <p className="text-sm text-amber-700">
            {bothArchived ? (
              <>
                Both the vendor and category associated with this product are currently archived. 
                Please restore them first before restoring this product.
              </>
            ) : vendor ? (
              <>
                The vendor associated with this product is currently archived. 
                Please restore the vendor first before restoring this product.
              </>
            ) : (
              <>
                The category associated with this product is currently archived. 
                Please restore the category first before restoring this product.
              </>
            )}
          </p>
        </div>
      </div>

      {/* Archived Vendor Info */}
      {vendor && (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
          {vendor.logo ? (
            <div className="w-10 h-10 relative rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={vendor.logo}
                alt={vendorNameEn}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{vendorNameEn}</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Archived Vendor
              </span>
            </div>
            {vendorNameAr && (
              <div className="text-xs text-gray-500" dir="rtl">{vendorNameAr}</div>
            )}
          </div>
        </div>
      )}

      {/* Archived Category Info */}
      {category && (
        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg border border-gray-200">
          {category.image ? (
            <div className="w-10 h-10 relative rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={category.image}
                alt={categoryNameEn}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
              <Folder className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{categoryNameEn}</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                Archived Category
              </span>
            </div>
            {categoryNameAr && (
              <div className="text-xs text-gray-500" dir="rtl">{categoryNameAr}</div>
            )}
          </div>
        </div>
      )}

      {/* Helpful tips */}
      <div className="space-y-2">
        {vendor && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
            <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Go to <strong>Archived → Vendors</strong> to restore the vendor &quot;{vendorNameEn}&quot;.
            </span>
          </div>
        )}
        {category && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 text-sm">
            <Folder className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Go to <strong>Archived → Categories</strong> to restore the category &quot;{categoryNameEn}&quot;.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
