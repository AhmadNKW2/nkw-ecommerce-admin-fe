/**
 * Helper functions to transform product form data to backend DTOs
 */

import { ProductFormData, MediaItem } from "../types/product-form.types";
import {
  CreateProductDto,
  MediaInputDto,
  ProductAttributeInput,
  ProductSpecificationInputDto,
} from "../types/product.types";

/**
 * Media upload data structure - contains files that need to be uploaded
 */
export interface MediaUploadData {
  multipleMedia?: MediaItem[];
  singleMedia?: MediaItem[];
}

/**
 * Uploaded media reference - after upload, contains media IDs
 */
export interface UploadedMediaReference {
  mediaId: number;
  isPrimary: boolean;
  sortOrder: number;
}

interface TransformFormDataOptions {
  includeEmptyRelations?: boolean;
  availableAttributes?: HierarchyDefinition[];
  availableSpecifications?: HierarchyDefinition[];
}

interface HierarchyDefinition {
  id: string;
  values?: Array<{
    id: string;
  }>;
}

const normalizeOptionalString = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const parseOptionalId = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const normalizeTags = (tags: ProductFormData["tags"]): string[] => {
  return Array.from(
    new Set((tags || []).map((tag) => tag.trim()).filter(Boolean)),
  );
};

export function buildProductAttributesPayload(
  attributes: ProductFormData["attributes"],
  availableAttributes?: HierarchyDefinition[],
): ProductAttributeInput[] {
  if (!attributes || attributes.length === 0) {
    return [];
  }

  const attributeValueOwnerMap = new Map<number, number>();
  availableAttributes?.forEach((attribute) => {
    const attributeId = parseInt(attribute.id, 10);
    if (Number.isNaN(attributeId)) {
      return;
    }

    attribute.values?.forEach((value) => {
      const valueId = parseInt(value.id, 10);
      if (!Number.isNaN(valueId)) {
        attributeValueOwnerMap.set(valueId, attributeId);
      }
    });
  });

  return attributes.flatMap((attribute) => {
    const attributeId = parseInt(attribute.id, 10);
    if (Number.isNaN(attributeId)) {
      return [];
    }

    const firstAttributeValueId = attribute.values
      .map((value) => parseInt(value.id, 10))
      .find((valueId) => !Number.isNaN(valueId));

    if (firstAttributeValueId === undefined) {
      return [];
    }

    return [
      {
        attribute_id: attributeValueOwnerMap.get(firstAttributeValueId) ?? attributeId,
        attribute_value_ids: [firstAttributeValueId],
      },
    ];
  });
}

export function buildProductSpecificationsPayload(
  specifications: ProductFormData["specifications"],
  availableSpecifications?: HierarchyDefinition[],
): ProductSpecificationInputDto[] {
  if (!specifications || specifications.length === 0) {
    return [];
  }

  const specificationValueOwnerMap = new Map<number, number>();
  availableSpecifications?.forEach((specification) => {
    const specificationId = parseInt(specification.id, 10);
    if (Number.isNaN(specificationId)) {
      return;
    }

    specification.values?.forEach((value) => {
      const valueId = parseInt(value.id, 10);
      if (!Number.isNaN(valueId)) {
        specificationValueOwnerMap.set(valueId, specificationId);
      }
    });
  });

  const groupedValues = new Map<number, Set<number>>();

  specifications.forEach((specification) => {
    const fallbackSpecificationId = parseInt(specification.id, 10);

    specification.values.forEach((value) => {
      const valueId = parseInt(value.id, 10);
      if (Number.isNaN(valueId)) {
        return;
      }

      const ownerSpecificationId =
        specificationValueOwnerMap.get(valueId) ?? fallbackSpecificationId;

      if (Number.isNaN(ownerSpecificationId)) {
        return;
      }

      if (!groupedValues.has(ownerSpecificationId)) {
        groupedValues.set(ownerSpecificationId, new Set<number>());
      }

      groupedValues.get(ownerSpecificationId)?.add(valueId);
    });
  });

  return Array.from(groupedValues.entries()).map(
    ([specificationId, valueIds]) => ({
      specification_id: specificationId,
      specification_value_ids: Array.from(valueIds),
    }),
  );
}

/**
 * Transform frontend ProductFormData to CreateProductDto (without media)
 * and extract media files for separate upload
 *
 * The flow is:
 * 1. Call this function to get DTO and media files
 * 2. Upload media files via mediaService.uploadMedia()
 * 3. Call addMediaToDto() to add media IDs to the DTO
 * 4. Send the complete DTO to create/update product
 */
export function transformFormDataToDto(
  data: ProductFormData,
  options: TransformFormDataOptions = {},
): { dto: CreateProductDto; mediaFiles: MediaUploadData } {
  const {
    includeEmptyRelations = false,
    availableAttributes,
    availableSpecifications,
  } = options;
  const specificationsPayload = buildProductSpecificationsPayload(
    data.specifications,
    availableSpecifications,
  );
  const attributesPayload = buildProductAttributesPayload(
    data.attributes,
    availableAttributes,
  );
  const linkedProductIds = Array.from(
    new Set(
      (data.linked_product_ids || [])
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id)),
    ),
  );
  const normalizedTags = normalizeTags(data.tags);

  const dto: CreateProductDto = {
    name_en: data.nameEn,
    name_ar: data.nameAr,
    sku: normalizeOptionalString(data.sku),
    record: normalizeOptionalString(data.record) ?? null,
    status: data.status,
    short_description_en: data.shortDescriptionEn || "",
    short_description_ar: data.shortDescriptionAr || "",
    long_description_en: data.longDescriptionEn || "",
    long_description_ar: data.longDescriptionAr || "",
    category_ids: (data.categoryIds || [])
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id)),
    reference_link: data.referenceLink?.trim() || null,
    quantity: data.quantity || 0,
    low_stock_threshold: data.low_stock_threshold || 10,
    is_out_of_stock: data.is_out_of_stock || false,
    meta_title_en: normalizeOptionalString(data.metaTitleEn),
    meta_title_ar: normalizeOptionalString(data.metaTitleAr),
    meta_description_en: normalizeOptionalString(data.metaDescriptionEn),
    meta_description_ar: normalizeOptionalString(data.metaDescriptionAr),
    tags: normalizedTags,
    linked_product_ids: linkedProductIds,
    visible: data.visible,
  };

  if (!data.pricing) {
    throw new Error("Pricing is required");
  }

  if (data.pricing.originalVendorPrice === undefined) {
    throw new Error("Original vendor price is required");
  }

  // Optional fields
  const vendorId = parseOptionalId(data.vendorId);
  const brandId = parseOptionalId(data.brandId);

  if (vendorId !== undefined) dto.vendor_id = vendorId;
  if (brandId !== undefined) dto.brand_id = brandId;
  if (specificationsPayload.length > 0 || includeEmptyRelations) {
    dto.specifications = specificationsPayload;
  }
  if (attributesPayload.length > 0 || includeEmptyRelations) {
    dto.attributes = attributesPayload;
  }

  dto.cost = data.pricing.cost;
  dto.original_vendor_price = data.pricing.originalVendorPrice;
  dto.original_vendor_sale_price = data.pricing.originalVendorSalePrice ?? null;
  dto.price = data.pricing.price;
  dto.sale_price = data.pricing.isSale === true ? data.pricing.salePrice : null;

  if (data.weightDimensions) {
    dto.weight = data.weightDimensions.weight;
    dto.length = data.weightDimensions.length;
    dto.width = data.weightDimensions.width;
    dto.height = data.weightDimensions.height;

    if (data.weightDimensions.weight !== undefined) {
      dto.weight_unit = data.weightDimensions.weightUnit ?? "kg";
    }

    if (
      data.weightDimensions.length !== undefined ||
      data.weightDimensions.width !== undefined ||
      data.weightDimensions.height !== undefined
    ) {
      dto.dimension_unit = data.weightDimensions.dimensionUnit ?? "cm";
    }
  }

  const mediaFiles: MediaUploadData = {};
  if (data.media && data.media.length > 0) {
    mediaFiles.singleMedia = data.media;
  }

  return { dto, mediaFiles };
}

/**
 * Build media array for the DTO from uploaded media references
 * Call this after uploading media files to get the media_id references
 */
export function buildMediaArray(
  uploadedMedia: UploadedMediaReference[],
): MediaInputDto[] {
  const sortedMedia = [...uploadedMedia].sort((left, right) => {
    if (left.isPrimary === right.isPrimary) {
      return left.sortOrder - right.sortOrder;
    }

    return left.isPrimary ? -1 : 1;
  });
  const hasExplicitPrimary = sortedMedia.some((media) => media.isPrimary);

  return sortedMedia.map((media, index) => ({
    media_id: media.mediaId,
    is_primary: hasExplicitPrimary ? media.isPrimary : index === 0,
    sort_order: index,
  }));
}
