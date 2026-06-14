"use client";

/**
 * Create Category Page
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import {
  useCategory,
  useCategories,
  useCreateCategory,
} from "../../src/services/categories/hooks/use-categories";
import { useAttributes } from "../../src/services/attributes/hooks/use-attributes";
import { useProducts } from "../../src/services/products/hooks/use-products";
import { useSpecifications } from "../../src/services/specifications/hooks/use-specifications";
import { CategoryForm } from "../../src/components/categories/CategoryForm";
import { ImageUploadItem } from "../../src/components/ui/image-upload";
import { validateCategoryForm } from "../../src/lib/validations";
import { ProductItem } from "../../src/components/common/ProductsTableSection";
import { buildCreateProductChanges } from "@/lib/product-changes";

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

  // Form state
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
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
  const { data: attributes = [] } = useAttributes();
  const { data: productsData } = useProducts({ limit: 1000 });
  const { data: specifications = [] } = useSpecifications();
  const sourceCategoryId = Number(copyFromCategoryId);
  const { data: sourceCategory } = useCategory(sourceCategoryId, {
    enabled: sourceCategoryId > 0,
  });
  const createCategory = useCreateCategory();

  // Transform products for the ProductsTableSection
  const allProducts: ProductItem[] = useMemo(() => {
    return productsData?.data?.data?.map((p) => ({
      id: p.id,
      name_en: p.name_en,
      name_ar: p.name_ar,
      sku: p.sku,
      slug: p.slug,
      primary_image: p.primary_image,
      price: p.price,
      category: p.category ? { name: p.category.name } : null,
      vendor: p.vendor ? { name: p.vendor.name } : null,
    })) || [];
  }, [productsData]);

  // Get assigned products
  const assignedProducts: ProductItem[] = useMemo(() => {
    return allProducts.filter((p) => product_ids.includes(p.id));
  }, [allProducts, product_ids]);

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

    setAttributeIds(nextAttributeIds);
    setSpecificationIds(nextSpecificationIds);
  }, [copyFromCategoryId, sourceCategory]);

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
        visible: visible,
        parent_id: parentId,
        image: image?.file || undefined,
        product_changes: buildCreateProductChanges(product_ids),
        attribute_ids,
        specification_ids,
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
      allProducts={allProducts}
      assignedProducts={assignedProducts}
      onSubmit={handleSubmit}
      isSubmitting={createCategory.isPending}
      submitButtonText="Create Category"
    />
  );
}
