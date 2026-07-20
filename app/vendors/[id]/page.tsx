"use client";

/**
 * Edit Vendor Page
 */

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../../src/providers/loading-provider";
import {
  useVendor,
  useUpdateVendor,
} from "../../src/services/vendors/hooks/use-vendors";
import { VendorForm } from "../../src/components/vendors/VendorForm";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { ImageUploadItem } from "../../src/components/ui/image-upload";
import { AlertCircle } from "lucide-react";
import { validateVendorForm } from "../../src/lib/validations";
import { buildUpdateProductChanges } from "@/lib/product-changes";

export default function EditVendorPage() {
  const router = useRouter();
  const params = useParams();
  const vendorId = Number(params.id);
  const { setShowOverlay } = useLoading();

  // Form state
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

  // Get the specific vendor
  const {
    data: vendor,
    isLoading,
    isError,
    error,
    refetch,
  } = useVendor(vendorId);

  const updateVendor = useUpdateVendor();

  const originalProductIds = useMemo(() => {
    const ids = (vendor as any)?.product_ids;
    return Array.isArray(ids) ? ids.filter((id: unknown): id is number => typeof id === "number") : [];
  }, [vendor]);

  // Initialize form when vendor loads
  useEffect(() => {
    if (vendor) {
      setNameEn(vendor.name_en);
      setNameAr(vendor.name_ar);
      setDescriptionEn(vendor.description_en || "");
      setDescriptionAr(vendor.description_ar || "");
      setMetaTitleEn(vendor.meta_title_en || "");
      setMetaTitleAr(vendor.meta_title_ar || "");
      setMetaDescriptionEn(vendor.meta_description_en || "");
      setMetaDescriptionAr(vendor.meta_description_ar || "");
      // Set existing logo URL
      if (vendor.logo) {
        setLogo({
          id: `existing-${Date.now()}`,
          file: undefined,
          preview: vendor.logo,
          type: "image",
          order: 0,
        });
      } else {
        setLogo(null);
      }
      setVisible(vendor.visible ?? true);
    }
  }, [vendor]);

  // Initialize product IDs from vendor response
  useEffect(() => {
    if (vendor) {
      setProductIds(originalProductIds);
    }
  }, [vendor, originalProductIds]);

  const validate = () => {
    const result = validateVendorForm({
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
      await updateVendor.mutateAsync({
        id: vendorId,
        data: {
          name_en: nameEn,
          name_ar: nameAr,
          description_en: descriptionEn || undefined,
          description_ar: descriptionAr || undefined,
          meta_title_en: metaTitleEn || undefined,
          meta_title_ar: metaTitleAr || undefined,
          meta_description_en: metaDescriptionEn || undefined,
          meta_description_ar: metaDescriptionAr || undefined,
          visible: visible,
          // Only send new file if one was uploaded
          logo: logo?.file || undefined,
          product_changes: buildUpdateProductChanges(originalProductIds, product_ids),
        },
      });
      
      router.push("/vendors");
    } catch (error) {
      console.error("Failed to update vendor:", error);
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
              <h3 className="text-xl font-bold mt-4">Error Loading Vendor</h3>
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

  if (!vendor) {
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
              <h3 className="text-xl font-bold mt-4">Vendor Not Found</h3>
              <p className="mt-2 max-w-md mx-auto">
                The vendor you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push("/vendors")} className="mt-4">
                Back to Vendors
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <VendorForm
      mode="edit"
      vendorId={vendorId}
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
      assignedProducts={[]}
      initialAssignedProductIds={originalProductIds}
      onSubmit={handleSubmit}
      isSubmitting={updateVendor.isPending}
      submitButtonText="Save Changes"
    />
  );
}
