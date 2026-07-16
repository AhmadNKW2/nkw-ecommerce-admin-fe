/**
 * Create Product Page
 * Page for creating new products with single-page form
 */

"use client";

import React from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useQueryClient } from "@tanstack/react-query";
import { ProductForm } from "../../src/components/products/ProductForm";
import { QuickSubmitForm } from "../../src/components/vendor-submissions/QuickSubmitForm";
import { ProductFormData } from "../../src/services/products/types/product-form.types";
import { useCategories } from "../../src/services/categories/hooks/use-categories";
import { useVendors } from "../../src/services/vendors/hooks/use-vendors";
import { useBrands } from "../../src/services/brands/hooks/use-brands";
import { useAttributes } from "../../src/services/attributes/hooks/use-attributes";
import { useSpecifications } from "../../src/services/specifications/hooks/use-specifications";
import { productService } from "../../src/services/products/api/product.service";
import { mediaService } from "../../src/services/media/api/media.service";
import { buildMediaArray, buildAttachmentsArray, transformFormDataToDto, UploadedMediaReference, UploadedAttachmentReference } from "../../src/services/products/form/transform";
import { queryKeys } from "../../src/lib/query-keys";
import { Attribute, AttributeValue } from "../../src/services/attributes/types/attribute.types";
import { Specification, SpecificationValue } from "../../src/services/specifications/types/specification.types";
import { finishToastError, finishToastSuccess, showLoadingToast, updateLoadingToast } from "../../src/lib/toast";
import { useAuth } from "../../src/contexts/auth.context";
import { getSimplifiedProductStatus, isSimplifiedProductCreator } from "../../src/lib/simplified-product-creator";
import { useAdminAccess } from "../../src/hooks/use-admin-access";
import { PageHeader } from "../../src/components/common/PageHeader";
import { Package } from "lucide-react";

export default function CreateProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    canEditProductPricing,
    canShowProductFormBasic,
    canShowProductFormAttributes,
    canShowProductFormSpecifications,
    canShowProductFormStock,
    canShowProductFormWeightDimensions,
    canShowProductFormMedia,
    canShowProductFormAttachments,
  } = useAdminAccess();
  const simplifiedMode = isSimplifiedProductCreator(user);
  const simplifiedStatus = getSimplifiedProductStatus(user?.role);
  const lockedVendorId = user?.vendorId ? String(user.vendorId) : undefined;
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: vendorsData, isLoading: vendorsLoading } = useVendors();
  const { data: brandsData, isLoading: brandsLoading } = useBrands();
  const { data: attributesData, isLoading: attributesLoading } = useAttributes();
  const { data: specificationsData, isLoading: specificationsLoading } = useSpecifications();

  // Vendor/store portal uses the dedicated quick-submit create page.
  if (simplifiedMode) {
    return (
      <div className="admin-page" dir="rtl">
        <PageHeader
          icon={<Package />}
          title="إنشاء منتج"
          description="أرسل منتجاً جديداً للمراجعة"
          cancelAction={{
            label: "إلغاء",
            onClick: () => router.push("/products"),
          }}
        />
        <QuickSubmitForm
          silentSuccess
          onCancel={() => router.push("/products")}
          onSuccess={() => router.push("/products")}
        />
      </div>
    );
  }

  // Transform backend data to frontend format
  const categories = categoriesData || [];

  const vendors = vendorsData?.data?.map(vendor => ({
    id: vendor.id.toString(),
    name: vendor.name_en,
    nameEn: vendor.name_en,
    nameAr: vendor.name_ar,
  })) || [];

  const brands = brandsData?.data?.map(brand => ({
    id: brand.id.toString(),
    name: brand.name_en,
    nameEn: brand.name_en,
    nameAr: brand.name_ar,
  })) || [];

  const attributes = attributesData?.map((attr: Attribute) => ({
    id: attr.id.toString(),
    parentId: attr.parent_id?.toString(),
    parentValueId: attr.parent_value_id?.toString(),
    name: attr.name_en,
    displayName: attr.name_ar,
    values: attr.values?.map((val: AttributeValue) => ({
      id: val.id.toString(),
      parentId: val.parent_value_id?.toString(),
      value: val.value_en,
      displayValue: val.value_ar,
    })) || [],
  })) || [];

  const specifications = specificationsData?.map((specification: Specification) => ({
    id: specification.id.toString(),
    parentId: specification.parent_id?.toString(),
    parentValueId: specification.parent_value_id?.toString(),
    name: specification.name_en,
    displayName: specification.name_ar,
    values: specification.values.map((value: SpecificationValue) => ({
      id: value.id.toString(),
      parentId: value.parent_value_id?.toString(),
      value: value.value_en,
      displayValue: value.value_ar,
    })),
  })) || [];

  const handleSubmit = async (data: ProductFormData) => {
    const toastId = showLoadingToast("Creating product...");
    try {
      const { dto, mediaFiles } = transformFormDataToDto(data, {
        availableAttributes: attributes,
        availableSpecifications: specifications,
        simplifiedMode,
        simplifiedStatus,
        lockedVendorId: lockedVendorId ? Number(lockedVendorId) : undefined,
        productFormAccess: {
          basic: canShowProductFormBasic,
          attributes: canShowProductFormAttributes,
          specifications: canShowProductFormSpecifications,
          stock: canShowProductFormStock,
          pricing: canEditProductPricing,
          weightDimensions: canShowProductFormWeightDimensions,
          media: canShowProductFormMedia,
          attachments: canShowProductFormAttachments,
        },
      });
      const productMedia = mediaFiles.singleMedia || [];
      const productAttachments = mediaFiles.attachments || [];
      const totalUploads =
        productMedia.filter((media) => !!media.file).length +
        productAttachments.filter((attachment) => !!attachment.file).length;

      let completedUploads = 0;

      if (totalUploads > 0) {
        updateLoadingToast(toastId, {
          title: "Uploading media",
          subtitle: `0/${totalUploads} files`,
          progress: 0,
        });
      } else {
        updateLoadingToast(toastId, {
          title: "Creating product",
          subtitle: "Preparing request",
          progress: 0,
        });
      }
      
      const uploadedMedia: UploadedMediaReference[] = [];
      const uploadedAttachments: UploadedAttachmentReference[] = [];

      if (productMedia.length > 0) {
        for (const media of productMedia) {
          if (media.file) {
            updateLoadingToast(toastId, {
              title: "Uploading media",
              subtitle: `${completedUploads + 1}/${totalUploads} files`,
              progress: totalUploads > 0 ? completedUploads / totalUploads : 0,
            });
            const uploadResult = await mediaService.uploadMedia(media.file);
            completedUploads += 1;
            updateLoadingToast(toastId, {
              title: "Uploading media",
              subtitle: `${completedUploads}/${totalUploads} files`,
              progress: totalUploads > 0 ? completedUploads / totalUploads : 0,
            });
            uploadedMedia.push({
              mediaId: uploadResult.data.id,
              isPrimary: media.isPrimary,
              sortOrder: media.order,
            });
            continue;
          }

          const existingMediaId = parseInt(media.id, 10);
          if (!Number.isNaN(existingMediaId)) {
            uploadedMedia.push({
              mediaId: existingMediaId,
              isPrimary: media.isPrimary,
              sortOrder: media.order,
            });
          }
        }
      }

      if (productAttachments.length > 0) {
        for (const attachment of productAttachments) {
          if (attachment.file) {
            updateLoadingToast(toastId, {
              title: "Uploading files",
              subtitle: `${completedUploads + 1}/${totalUploads} files`,
              progress: totalUploads > 0 ? completedUploads / totalUploads : 0,
            });
            const uploadResult = await mediaService.uploadAttachment(attachment.file);
            completedUploads += 1;
            updateLoadingToast(toastId, {
              title: "Uploading files",
              subtitle: `${completedUploads}/${totalUploads} files`,
              progress: totalUploads > 0 ? completedUploads / totalUploads : 0,
            });
            uploadedAttachments.push({
              mediaId: uploadResult.data.id,
              sortOrder: attachment.order,
            });
            continue;
          }

          const existingAttachmentId = parseInt(attachment.id, 10);
          if (!Number.isNaN(existingAttachmentId)) {
            uploadedAttachments.push({
              mediaId: existingAttachmentId,
              sortOrder: attachment.order,
            });
          }
        }
      }

      if (productMedia.length > 0) {
        dto.media = buildMediaArray(uploadedMedia);
      }
      if (productAttachments.length > 0) {
        dto.attachments = buildAttachmentsArray(uploadedAttachments);
      }

      updateLoadingToast(toastId, {
        title: "Creating product",
        subtitle: "Sending request",
        progress: 0.9,
      });
      await productService.createProduct(dto);
      
      // Invalidate products list query to refetch data
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });

      finishToastSuccess(toastId, "Product created successfully");
      
      router.push("/products");
    } catch (error: any) {
      console.error("Error creating product:", error);
      finishToastError(toastId, error?.message || "Failed to create product");
      throw error; // Re-throw so ProductForm knows submission failed and won't clear draft
    }
  };

  const handleSaveDraft = async (data: Partial<ProductFormData>) => {
    try {
      // TODO: Implement draft saving functionality
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  return (
    <ProductForm
      onSubmit={handleSubmit}
      onSaveDraft={handleSaveDraft}
      categories={categories}
      vendors={vendors}
      brands={brands}
      attributes={attributes}
      specifications={specifications}
      simplifiedMode={simplifiedMode}
      lockedVendorId={lockedVendorId}
      simplifiedStatus={simplifiedStatus}
    />
  );
}
