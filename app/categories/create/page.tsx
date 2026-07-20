"use client";

/**
 * Create Category Page
 */

import { useState, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import {
  useCategory,
  useCategories,
  useCreateCategory,
} from "../../src/services/categories/hooks/use-categories";
import { useAttributes } from "../../src/services/attributes/hooks/use-attributes";
import { useSpecifications } from "../../src/services/specifications/hooks/use-specifications";
import { CategoryForm } from "../../src/components/categories/CategoryForm";
import { ImageUploadItem } from "../../src/components/ui/image-upload";
import { validateCategoryForm } from "../../src/lib/validations";
import { ProductItem } from "../../src/components/common/ProductsTableSection";
import { buildCreateProductChanges } from "@/lib/product-changes";
import { useResolvedFeatureToggles } from "../../src/hooks/use-resolved-feature-toggles";

/** Stable empty list so ProductsTableSection keeps modal selections. */
const EMPTY_ASSIGNED_PRODUCTS: ProductItem[] = [];

const extractLinkedIds = (directIds: unknown, relations: unknown): number[] => {
  const normalizedIds = Array.isArray(directIds)
    ? directIds.filter((id): id is number => typeof id === "number")
    : [];

  const relationIds = Array.isArray(relations)
    ? relations
        .map((item) =>
          typeof item === "object" && item !== null && "id" in item ? (item as { id?: unknown }).id : undefined
        )
        .filter((id): id is number => typeof id === "number")
    : [];

  return [...new Set([...normalizedIds, ...relationIds])];
};

export default function CreateCategoryPage() {
  const router = useRouter();
  const { isEnabled } = useResolvedFeatureToggles();
  const attributesEnabled = isEnabled("attributes_enabled");
  const specificationsEnabled = isEnabled("specifications_enabled");

  // Form state
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [metaTitleEn, setMetaTitleEn] = useState("");
  const [metaTitleAr, setMetaTitleAr] = useState("");
  const [metaDescriptionEn, setMetaDescriptionEn] = useState("");
  const [metaDescriptionAr, setMetaDescriptionAr] = useState("");
  const [image, setImage] = useState<ImageUploadItem | null>(null);
  const [visible, setVisible] = useState(true);
  const [parentId, setParentId] = useState<number | null>(null);
  const [product_ids, setProductIds] = useState<number[]>([]);
  const [attribute_ids, setAttributeIds] = useState<number[]>([]);
  const [specification_ids, setSpecificationIds] = useState<number[]>([]);
  const [copyFromCategoryId, setCopyFromCategoryId] = useState("");
  const [formErrors, setFormErrors] = useState<{
    name_en?: string;
    name_ar?: string;
    description_en?: string;
    description_ar?: string;
    image?: string;
  }>({});

  // Get parent categories for dropdown
  const { data: categories } = useCategories();
  const { data: attributes = [] } = useAttributes(undefined, {
    enabled: attributesEnabled,
  });
  const { data: specifications = [] } = useSpecifications(undefined, {
    enabled: specificationsEnabled,
  });
  const sourceCategoryId = Number(copyFromCategoryId);
  const { data: sourceCategory } = useCategory(sourceCategoryId, {
    enabled: sourceCategoryId > 0,
  });
  const createCategory = useCreateCategory();

  useEffect(() => {
    if (!copyFromCategoryId || !sourceCategory) {
      return;
    }

    const nextAttributeIds = extractLinkedIds(
      (sourceCategory as any).attribute_ids,
      (sourceCategory as any).attributes
    );
    const nextSpecificationIds = extractLinkedIds(
      (sourceCategory as any).specification_ids,
      (sourceCategory as any).specifications
    );

    setAttributeIds(attributesEnabled ? nextAttributeIds : []);
    setSpecificationIds(specificationsEnabled ? nextSpecificationIds : []);
  }, [copyFromCategoryId, sourceCategory, attributesEnabled, specificationsEnabled]);

  const validate = () => {
    const result = validateCategoryForm({
      name_en: nameEn,
      name_ar: nameAr,
      description_en: descriptionEn,
      description_ar: descriptionAr,
    });

    if (!result.isValid) {
      setFormErrors(result.errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      await createCategory.mutateAsync({
        name_en: nameEn,
        name_ar: nameAr,
        description_en: descriptionEn || undefined,
        description_ar: descriptionAr || undefined,
        meta_title_en: metaTitleEn || undefined,
        meta_title_ar: metaTitleAr || undefined,
        meta_description_en: metaDescriptionEn || undefined,
        meta_description_ar: metaDescriptionAr || undefined,
        visible: visible,
        parent_id: parentId,
        image: image?.file || undefined,
        product_changes: buildCreateProductChanges(product_ids),
        ...(attributesEnabled ? { attribute_ids } : {}),
        ...(specificationsEnabled ? { specification_ids } : {}),
      });
      
      router.push("/categories");
    } catch (error) {
      console.error("Failed to create category:", error);
    }
  };

  return (
    <CategoryForm
      mode="create"
      nameEn={nameEn}
      nameAr={nameAr}
      descriptionEn={descriptionEn}
      descriptionAr={descriptionAr}
      metaTitleEn={metaTitleEn}
      metaTitleAr={metaTitleAr}
      metaDescriptionEn={metaDescriptionEn}
      metaDescriptionAr={metaDescriptionAr}
      image={image}
      visible={visible}
      parentId={parentId}
      product_ids={product_ids}
      attributeIds={attribute_ids.map(String)}
      specificationIds={specification_ids.map(String)}
      copyFromCategoryId={copyFromCategoryId}
      onNameEnChange={(value) => {
        setNameEn(value);
        if (formErrors.name_en) {
          setFormErrors((prev) => ({ ...prev, name_en: undefined }));
        }
      }}
      onNameArChange={(value) => {
        setNameAr(value);
        if (formErrors.name_ar) {
          setFormErrors((prev) => ({ ...prev, name_ar: undefined }));
        }
      }}
      onDescriptionEnChange={(value) => {
        setDescriptionEn(value);
        if (formErrors.description_en) {
          setFormErrors((prev) => ({ ...prev, description_en: undefined }));
        }
      }}
      onDescriptionArChange={(value) => {
        setDescriptionAr(value);
        if (formErrors.description_ar) {
          setFormErrors((prev) => ({ ...prev, description_ar: undefined }));
        }
      }}
      onMetaTitleEnChange={setMetaTitleEn}
      onMetaTitleArChange={setMetaTitleAr}
      onMetaDescriptionEnChange={setMetaDescriptionEn}
      onMetaDescriptionArChange={setMetaDescriptionAr}
      onImageChange={setImage}
      onVisibleChange={setVisible}
      onParentIdChange={setParentId}
      onProductIdsChange={setProductIds}
      onAttributeIdsChange={(value) => setAttributeIds(value.map(Number))}
      onSpecificationIdsChange={(value) => setSpecificationIds(value.map(Number))}
      onCopyFromCategoryIdChange={setCopyFromCategoryId}
      formErrors={formErrors}
      parentCategories={categories || []}
      allAttributes={attributes}
      allSpecifications={specifications}
      assignedProducts={EMPTY_ASSIGNED_PRODUCTS}
      onSubmit={handleSubmit}
      isSubmitting={createCategory.isPending}
      submitButtonText="Create Category"
    />
  );
}
