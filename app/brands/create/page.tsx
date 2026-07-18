"use client";

/**
 * Create Brand Page
 */

import { useState, useMemo } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useCreateBrand } from "../../src/services/brands/hooks/use-brands";
import { useProducts } from "../../src/services/products/hooks/use-products";
import { BrandForm } from "../../src/components/brands/BrandForm";
import { ImageUploadItem } from "../../src/components/ui/image-upload";
import { validateBrandForm } from "../../src/lib/validations";
import { ProductItem } from "../../src/components/common/ProductsTableSection";
import { buildCreateProductChanges } from "@/lib/product-changes";

export default function CreateBrandPage() {
  const router = useRouter();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [metaTitleEn, setMetaTitleEn] = useState("");
  const [metaTitleAr, setMetaTitleAr] = useState("");
  const [metaDescriptionEn, setMetaDescriptionEn] = useState("");
  const [metaDescriptionAr, setMetaDescriptionAr] = useState("");
  const [logo, setLogo] = useState<ImageUploadItem | null>(null);
  const [visible, setVisible] = useState(true);
  const [product_ids, setProductIds] = useState<number[]>([]);
  const [formErrors, setFormErrors] = useState<{
    name_en?: string;
    name_ar?: string;
    description_en?: string;
    description_ar?: string;
    logo?: string;
  }>({});

  const { data: productsData } = useProducts({ limit: 1000 });
  const createBrand = useCreateBrand();

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

  const assignedProducts: ProductItem[] = useMemo(() => {
    return allProducts.filter((p) => product_ids.includes(p.id));
  }, [allProducts, product_ids]);

  const validate = () => {
    const result = validateBrandForm({
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
      await createBrand.mutateAsync({
        name_en: nameEn,
        name_ar: nameAr,
        description_en: descriptionEn || undefined,
        description_ar: descriptionAr || undefined,
        meta_title_en: metaTitleEn || undefined,
        meta_title_ar: metaTitleAr || undefined,
        meta_description_en: metaDescriptionEn || undefined,
        meta_description_ar: metaDescriptionAr || undefined,
        visible,
        logo: logo?.file || undefined,
        product_changes: buildCreateProductChanges(product_ids),
      });

      router.push("/brands");
    } catch (error) {
      console.error("Failed to create brand:", error);
    }
  };

  return (
    <BrandForm
      mode="create"
      nameEn={nameEn}
      nameAr={nameAr}
      descriptionEn={descriptionEn}
      descriptionAr={descriptionAr}
      metaTitleEn={metaTitleEn}
      metaTitleAr={metaTitleAr}
      metaDescriptionEn={metaDescriptionEn}
      metaDescriptionAr={metaDescriptionAr}
      logo={logo}
      visible={visible}
      product_ids={product_ids}
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
      onLogoChange={setLogo}
      onVisibleChange={setVisible}
      onProductIdsChange={setProductIds}
      formErrors={formErrors}
      allProducts={allProducts}
      assignedProducts={assignedProducts}
      onSubmit={handleSubmit}
      isSubmitting={createBrand.isPending}
      submitButtonText="Create Brand"
    />
  );
}
