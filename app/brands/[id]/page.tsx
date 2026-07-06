"use client";

/**
 * Edit Brand Page
 */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../../src/providers/loading-provider";
import {
  useBrand,
  useUpdateBrand,
} from "../../src/services/brands/hooks/use-brands";
import { BrandForm } from "../../src/components/brands/BrandForm";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { ImageUploadItem } from "../../src/components/ui/image-upload";
import { RefreshCw, AlertCircle } from "lucide-react";
import { validateBrandForm } from "../../src/lib/validations";
import { ProductItem } from "../../src/components/common/ProductsTableSection";
import { mapProductToProductItem } from "../../src/components/common/product-table-utils";
import { buildUpdateProductChanges } from "@/lib/product-changes";

export default function EditBrandPage() {
  const router = useRouter();
  const params = useParams();
  const brandId = Number(params.id);
  const { setShowOverlay } = useLoading();

  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
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

  const {
    data: brand,
    isLoading,
    isError,
    error,
    refetch,
  } = useBrand(brandId);

  const updateBrand = useUpdateBrand();

  // Get assigned products from brand response
  const assignedProducts: ProductItem[] = useMemo(() => {
    const products = (brand as any)?.products || [];
    return products.map((product: any) => mapProductToProductItem(product));
  }, [brand]);

  const originalProductIds = useMemo(() => {
    const products = (brand as any)?.products || [];
    return products.map((product: { id: number }) => product.id);
  }, [brand]);

  useEffect(() => {
    if (brand) {
      setNameEn(brand.name_en);
      setNameAr(brand.name_ar);
      setDescriptionEn(brand.description_en || "");
      setDescriptionAr(brand.description_ar || "");
      if (brand.logo) {
        setLogo({
          id: `existing-${Date.now()}`,
          file: undefined,
          preview: brand.logo,
          type: "image",
          order: 0,
        });
      } else {
        setLogo(null);
      }
      setVisible(brand.visible ?? true);
    }
  }, [brand]);

  // Initialize product IDs from brand response
  useEffect(() => {
    if (brand && (brand as any).products) {
      setProductIds((brand as any).products.map((p: { id: number }) => p.id));
    }
  }, [brand]);

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
      await updateBrand.mutateAsync({
        id: brandId,
        data: {
          name_en: nameEn,
          name_ar: nameAr,
          description_en: descriptionEn || undefined,
          description_ar: descriptionAr || undefined,
          visible,
          logo: logo?.file || undefined,
          product_changes: buildUpdateProductChanges(originalProductIds, product_ids),
        },
      });

      router.push("/brands");
    } catch (err) {
      console.error("Failed to update brand:", err);
    }
  };

  // Show loading overlay while data is loading
  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="text-xl font-bold mt-4">Error Loading Brand</h3>
              <p className="mt-2 max-w-md mx-auto">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="text-xl font-bold mt-4">Brand Not Found</h3>
              <p className="mt-2 max-w-md mx-auto">
                The brand you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push("/brands")} className="mt-4">
                Back to Brands
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <BrandForm
      mode="edit"
      nameEn={nameEn}
      nameAr={nameAr}
      descriptionEn={descriptionEn}
      descriptionAr={descriptionAr}
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
      onLogoChange={setLogo}
      onVisibleChange={setVisible}
      onProductIdsChange={setProductIds}
      formErrors={formErrors}
      assignedProducts={assignedProducts}
      onSubmit={handleSubmit}
      isSubmitting={updateBrand.isPending}
      submitButtonText="Save Changes"
    />
  );
}
