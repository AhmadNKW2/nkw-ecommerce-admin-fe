"use client";

/**
 * Brand Form Component
 * Reusable form for creating and editing brands (mirrors vendor form)
 */

import { useRouter } from "@/hooks/use-loading-router";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Toggle } from "../ui/toggle";
import { ImageUpload, ImageUploadItem } from "../ui/image-upload";
import { PageHeader } from "../common/PageHeader";
import { Tags } from "lucide-react";
import { ProductsTableSection, ProductItem } from "../common/ProductsTableSection";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";

interface BrandFormProps {
  mode: "create" | "edit";
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  logo: ImageUploadItem | null;
  visible: boolean;
  product_ids: number[];
  onNameEnChange: (value: string) => void;
  onNameArChange: (value: string) => void;
  onDescriptionEnChange: (value: string) => void;
  onDescriptionArChange: (value: string) => void;
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
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText: string;
}

export const BrandForm: React.FC<BrandFormProps> = ({
  mode,
  nameEn,
  nameAr,
  descriptionEn,
  descriptionAr,
  logo,
  visible,
  product_ids,
  onNameEnChange,
  onNameArChange,
  onDescriptionEnChange,
  onDescriptionArChange,
  onLogoChange,
  onVisibleChange,
  onProductIdsChange,
  formErrors,
  allProducts = [],
  assignedProducts = [],
  onSubmit,
  isSubmitting,
  submitButtonText,
}) => {
  const router = useRouter();
  useEnterToSubmit(onSubmit, isSubmitting);

  const handleBack = () => {
    router.push("/brands");
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Tags />}
        title={mode === "create" ? "Create Brand" : "Edit Brand"}
        description={mode === "create" ? "Add a new brand" : "Update brand details"}
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

      <Card>
        <h2 className="text-lg font-semibold">Brand Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="Name (English)"
            value={nameEn}
            onChange={(e) => onNameEnChange(e.target.value)}
            error={formErrors.name_en}
            required
            maxLength={100}
          />

          <Input
            label="Name (Arabic)"
            value={nameAr}
            onChange={(e) => onNameArChange(e.target.value)}
            error={formErrors.name_ar}
            required
            isRtl
            maxLength={100}
          />

          <Textarea
            label="Description (English)"
            value={descriptionEn}
            onChange={(e) => onDescriptionEnChange(e.target.value)}
            error={formErrors.description_en}
            rows={3}
            maxLength={1000}
          />

          <Textarea
            label="Description (Arabic)"
            value={descriptionAr}
            onChange={(e) => onDescriptionArChange(e.target.value)}
            error={formErrors.description_ar}
            rows={3}
            isRtl
            maxLength={1000}
          />

          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <p className="font-medium">Visible Status</p>
            <Toggle checked={visible} onChange={onVisibleChange} />
          </div>
        </div>

        <ImageUpload
          label="Brand Logo"
          value={logo ? [logo] : []}
          onChange={(items) => onLogoChange(items.length > 0 ? items[0] : null)}
          error={formErrors.logo}
          isMulti={false}
          accept="image/*"
          placeholder="or drag and drop a logo here"
          previewSize="lg"
        />
      </Card>

      <Card>
        <ProductsTableSection
          title="Brand Products"
          products={assignedProducts}
          onProductsChange={onProductIdsChange}
          emptyMessage="No products assigned to this brand"
          editButtonText="Edit Products"
          modalTitle="Manage Brand Products"
        />
      </Card>
    </div>
  );
};
