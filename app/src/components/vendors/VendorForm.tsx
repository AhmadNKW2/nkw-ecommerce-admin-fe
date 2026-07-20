"use client";

/**
 * Vendor Form Component
 * Reusable form for creating and editing vendors
 */

import { useRouter } from "@/hooks/use-loading-router";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Toggle } from "../ui/toggle";
import { ImageUpload, ImageUploadItem } from "../ui/image-upload";
import { PageHeader } from "../common/PageHeader";
import { Building2 } from "lucide-react";
import { ProductsTableSection, ProductItem } from "../common/ProductsTableSection";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";
import { VendorCategoryTreeSection } from "./VendorCategoryTreeSection";

interface VendorFormProps {
  mode: "create" | "edit";
  vendorId?: number;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  metaTitleEn: string;
  metaTitleAr: string;
  metaDescriptionEn: string;
  metaDescriptionAr: string;
  logo: ImageUploadItem | null;
  visible: boolean;
  product_ids: number[];
  onNameEnChange: (value: string) => void;
  onNameArChange: (value: string) => void;
  onDescriptionEnChange: (value: string) => void;
  onDescriptionArChange: (value: string) => void;
  onMetaTitleEnChange: (value: string) => void;
  onMetaTitleArChange: (value: string) => void;
  onMetaDescriptionEnChange: (value: string) => void;
  onMetaDescriptionArChange: (value: string) => void;
  onLogoChange: (value: ImageUploadItem | null) => void;
  onVisibleChange: (value: boolean) => void;
  onProductIdsChange: (value: number[]) => void;
  formErrors: {
    name_en?: string;
    name_ar?: string;
    description_en?: string;
    description_ar?: string;
    logo?: string;
  };
  allProducts?: ProductItem[];
  assignedProducts?: ProductItem[];
  initialAssignedProductIds?: number[];
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText: string;
}

export const VendorForm: React.FC<VendorFormProps> = ({
  mode,
  vendorId,
  nameEn,
  nameAr,
  descriptionEn,
  descriptionAr,
  metaTitleEn,
  metaTitleAr,
  metaDescriptionEn,
  metaDescriptionAr,
  logo,
  visible,
  product_ids,
  onNameEnChange,
  onNameArChange,
  onDescriptionEnChange,
  onDescriptionArChange,
  onMetaTitleEnChange,
  onMetaTitleArChange,
  onMetaDescriptionEnChange,
  onMetaDescriptionArChange,
  onLogoChange,
  onVisibleChange,
  onProductIdsChange,
  formErrors,
  allProducts = [],
  assignedProducts = [],
  initialAssignedProductIds,
  onSubmit,
  isSubmitting,
  submitButtonText,
}) => {
  const router = useRouter();
  useEnterToSubmit(onSubmit, isSubmitting);

  const handleBack = () => {
    router.push("/vendors");
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <PageHeader
        icon={<Building2 />}
        title={mode === "create" ? "Create Vendor" : "Edit Vendor"}
        description={mode === "create" ? "Add a new vendor" : "Update vendor details"}
        cancelAction={{
          label: "Cancel",
          onClick: handleBack,
          disabled: isSubmitting,
        }}
        action={{
          label: isSubmitting ? "Saving..." : submitButtonText,
          onClick: onSubmit,
          disabled: isSubmitting,
        }}
      />

      {/* Form */}
      <Card>
        <h2 className="text-lg font-semibold">Vendor Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Name English */}
          <Input
            label="Name (English)"
            value={nameEn}
            onChange={(e) => onNameEnChange(e.target.value)}
            error={formErrors.name_en}
            required
            maxLength={100}
          />

          {/* Name Arabic */}
          <Input
            label="Name (Arabic)"
            value={nameAr}
            onChange={(e) => onNameArChange(e.target.value)}
            error={formErrors.name_ar}
            required
            isRtl
            maxLength={100}
          />

          {/* Description English */}
          <Textarea
            label="Description (English)"
            value={descriptionEn}
            onChange={(e) => onDescriptionEnChange(e.target.value)}
            error={formErrors.description_en}
            rows={3}
            maxLength={1000}
          />

          {/* Description Arabic */}
          <Textarea
            label="Description (Arabic)"
            value={descriptionAr}
            onChange={(e) => onDescriptionArChange(e.target.value)}
            error={formErrors.description_ar}
            rows={3}
            isRtl
            maxLength={1000}
          />

          <Input
            label="Meta Title (English)"
            value={metaTitleEn}
            onChange={(e) => onMetaTitleEnChange(e.target.value)}
            maxLength={70}
          />
          <Input
            label="Meta Title (Arabic)"
            value={metaTitleAr}
            onChange={(e) => onMetaTitleArChange(e.target.value)}
            maxLength={70}
            isRtl
          />
          <Textarea
            label="Meta Description (English)"
            value={metaDescriptionEn}
            onChange={(e) => onMetaDescriptionEnChange(e.target.value)}
            rows={3}
            maxLength={160}
          />
          <Textarea
            label="Meta Description (Arabic)"
            value={metaDescriptionAr}
            onChange={(e) => onMetaDescriptionArChange(e.target.value)}
            rows={3}
            maxLength={160}
            isRtl
          />

          {/* Visible Status */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <p className="font-medium">Visible Status</p>
            <Toggle checked={visible} onChange={onVisibleChange} />
          </div>
        </div>

        {/* Logo Upload */}
        <ImageUpload
          label="Vendor Logo"
          value={logo ? [logo] : []}
          onChange={(items) => onLogoChange(items.length > 0 ? items[0] : null)}
          error={formErrors.logo}
          isMulti={false}
          accept="image/*"
          placeholder="or drag and drop a logo here"
          previewSize="lg"
        />

      </Card>

      <VendorCategoryTreeSection mode={mode} vendorId={vendorId} />

      {/* Products Section */}
      <Card>
        <ProductsTableSection
          title="Vendor Products"
          products={assignedProducts}
          assignedProductIds={
            mode === "edit" ? initialAssignedProductIds ?? product_ids : undefined
          }
          productListScope={
            mode === "edit" && vendorId
              ? { vendor_ids: String(vendorId) }
              : undefined
          }
          onProductsChange={onProductIdsChange}
          emptyMessage="No products assigned to this vendor"
          editButtonText="Edit Products"
          modalTitle="Manage Vendor Products"
        />
      </Card>
    </div>
  );
};
