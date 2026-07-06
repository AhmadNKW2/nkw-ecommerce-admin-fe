"use client";

/**
 * Category Form Component
 * Reusable form for creating and editing categories
 */

import { useRouter } from "@/hooks/use-loading-router";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Toggle } from "../ui/toggle";
import { Select } from "../ui/select";
import { ImageUpload, ImageUploadItem } from "../ui/image-upload";
import { PageHeader } from "../common/PageHeader";
import { Folder } from "lucide-react";
import { Category } from "../../services/categories/types/category.types";
import { ProductsTableSection, ProductItem } from "../common/ProductsTableSection";
import { CategoryTreeSelect } from "../products/CategoryTreeSelect";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";
import { useResolvedFeatureToggles } from "../../hooks/use-resolved-feature-toggles";

const removeCategoryBranch = (
  categories: Category[],
  blockedCategoryId: number
): Category[] => {
  return categories.reduce((acc, category) => {
    if (category.id === blockedCategoryId) {
      return acc;
    }

    const nextChildren = category.children
      ? removeCategoryBranch(category.children, blockedCategoryId)
      : undefined;

    acc.push(
      nextChildren === category.children
        ? category
        : {
            ...category,
            children: nextChildren,
          }
    );

    return acc;
  }, [] as Category[]);
};

interface CategoryFormProps {
  mode: "create" | "edit";
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  image: ImageUploadItem | null;
  visible: boolean;
  parentId: number | null;
  product_ids: number[];
  attributeIds: string[];
  specificationIds: string[];
  copyFromCategoryId: string;
  onNameEnChange: (value: string) => void;
  onNameArChange: (value: string) => void;
  onDescriptionEnChange?: (value: string) => void;
  onDescriptionArChange?: (value: string) => void;
  onImageChange: (value: ImageUploadItem | null) => void;
  onVisibleChange: (value: boolean) => void;
  onParentIdChange: (value: number | null) => void;
  onProductIdsChange: (value: number[]) => void;
  onAttributeIdsChange: (value: string[]) => void;
  onSpecificationIdsChange: (value: string[]) => void;
  onCopyFromCategoryIdChange: (value: string) => void;
  formErrors: {
    name_en?: string;
    name_ar?: string;
    description_en?: string;
    description_ar?: string;
    image?: string;
  };
  parentCategories?: Category[];
  allAttributes?: Array<{ id: number; name_en: string; name_ar?: string | null }>;
  allSpecifications?: Array<{ id: number; name_en: string; name_ar?: string | null }>;
  allProducts?: ProductItem[];
  assignedProducts?: ProductItem[];
  onSubmit: () => void;
  isSubmitting: boolean;
  submitButtonText: string;
  currentCategoryId?: number; // Add this to exclude self from parent options
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  mode,
  nameEn,
  nameAr,
  descriptionEn = "",
  descriptionAr = "",
  image,
  visible,
  parentId,
  product_ids,
  attributeIds,
  specificationIds,
  copyFromCategoryId,
  onNameEnChange,
  onNameArChange,
  onDescriptionEnChange,
  onDescriptionArChange,
  onImageChange,
  onVisibleChange,
  onParentIdChange,
  onProductIdsChange,
  onAttributeIdsChange,
  onSpecificationIdsChange,
  onCopyFromCategoryIdChange,
  formErrors,
  parentCategories = [],
  allAttributes = [],
  allSpecifications = [],
  allProducts = [],
  assignedProducts = [],
  onSubmit,
  isSubmitting,
  submitButtonText,
  currentCategoryId,
}) => {
  const router = useRouter();
  const { isEnabled } = useResolvedFeatureToggles();
  const attributesEnabled = isEnabled("attributes_enabled");
  const specificationsEnabled = isEnabled("specifications_enabled");
  const showAttributesSpecificationsSection =
    attributesEnabled || specificationsEnabled;
  useEnterToSubmit(onSubmit, isSubmitting);

  const handleBack = () => {
    router.push("/categories");
  };

  // Remove the current category branch so it can't become its own parent.
  const availableParents = currentCategoryId
    ? removeCategoryBranch(parentCategories, currentCategoryId)
    : parentCategories;

  return (
    <div className="admin-page">
      {/* Header */}
      <PageHeader
        icon={<Folder />}
        title={mode === "create" ? "Create Category" : "Edit Category"}
        description={mode === "create" ? "Add a new product category" : "Update category details"}
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
        <h2 className="text-lg font-semibold">Category Details</h2>

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
          {onDescriptionEnChange && (
            <Textarea
              label="Description (English)"
              value={descriptionEn}
              onChange={(e) => onDescriptionEnChange(e.target.value)}
              error={formErrors.description_en}
              rows={3}
              maxLength={500}
            />
          )}

          {/* Description Arabic */}
          {onDescriptionArChange && (
            <Textarea
              label="Description (Arabic)"
              value={descriptionAr}
              onChange={(e) => onDescriptionArChange(e.target.value)}
              error={formErrors.description_ar}
              rows={3}
              isRtl
              maxLength={500}
            />
          )}
          {/* Parent Category */}
          <CategoryTreeSelect
            label="Parent Category"
            categories={availableParents}
            selectedIds={parentId ? [parentId.toString()] : []}
            onChange={(ids) => {
              const val = ids.length > 0 ? ids[0] : null;
              onParentIdChange(val ? Number(val) : null);
            }}
            singleSelect={true}
          />

          {/* Visibility Status */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <p className="font-medium">Visibility Status</p>
            <Toggle checked={visible} onChange={onVisibleChange} />
          </div>


        </div>

        {/* Image Upload */}
        <ImageUpload
          label="Category Image"
          value={image ? [image] : []}
          onChange={(items) => onImageChange(items.length > 0 ? items[0] : null)}
          error={formErrors.image}
          isMulti={false}
          accept="image/*"
          placeholder="or drag and drop an image here"
          previewSize="lg"
        />

      </Card>

      {showAttributesSpecificationsSection && (
      <Card>
        <h2 className="text-lg font-semibold">Category Attributes & Specifications</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <CategoryTreeSelect
              label="Same Attributes & Specifications of Category"
              categories={availableParents}
              selectedIds={copyFromCategoryId ? [copyFromCategoryId] : []}
              onChange={(ids) => onCopyFromCategoryIdChange(ids[0] || "")}
              singleSelect={true}
              disabled={availableParents.length === 0}
            />
          </div>

          {attributesEnabled && (
          <Select
            label="Attributes"
            value={attributeIds}
            onChange={(value) => onAttributeIdsChange((value as string[]) || [])}
            onClear={() => onAttributeIdsChange([])}
            options={allAttributes.map((attribute) => ({
              value: attribute.id.toString(),
              label: attribute.name_ar
                ? `${attribute.name_en} - ${attribute.name_ar}`
                : attribute.name_en,
            }))}
            search={true}
            multiple={true}
            placeholder="Select attributes"
          />
          )}

          {specificationsEnabled && (
          <Select
            label="Specifications"
            value={specificationIds}
            onChange={(value) => onSpecificationIdsChange((value as string[]) || [])}
            onClear={() => onSpecificationIdsChange([])}
            options={allSpecifications.map((specification) => ({
              value: specification.id.toString(),
              label: specification.name_ar
                ? `${specification.name_en} - ${specification.name_ar}`
                : specification.name_en,
            }))}
            search={true}
            multiple={true}
            placeholder="Select specifications"
          />
          )}
        </div>
      </Card>
      )}

      {/* Products Section */}
      <Card>
        <ProductsTableSection
          title="Category Products"
          products={assignedProducts}
          onProductsChange={onProductIdsChange}
          emptyMessage="No products in this category"
          editButtonText="Edit Products"
          modalTitle="Manage Category Products"
        />
      </Card>
    </div>
  );
};
