/**
 * Product Form Types for Multi-Step Product Creation/Edit
 */

import { z } from "zod";

// Attribute Types
export interface AttributeValue {
  id: string;
  value: string;
  order: number;
}

export interface Attribute {
  id: string;
  name: string;
  values: AttributeValue[];
  order: number;
}

export interface ProductSpecificationSelectionValue {
  id: string;
  label: string;
  order: number;
}

export interface ProductSpecificationSelection {
  id: string;
  name: string;
  values: ProductSpecificationSelectionValue[];
  order: number;
}

// Pricing Configuration
export interface Pricing {
  cost?: number;
  originalVendorPrice?: number;
  originalVendorSalePrice?: number;
  price?: number;
  isSale?: boolean;
  salePrice?: number;
}

export const WEIGHT_UNITS = ["g", "kg"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const DIMENSION_UNITS = ["mm", "cm", "m"] as const;
export type DimensionUnit = (typeof DIMENSION_UNITS)[number];

// Weight & Dimensions
export interface WeightDimensions {
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  weightUnit?: WeightUnit;
  dimensionUnit?: DimensionUnit;
}

// Media Configuration
export interface MediaItem {
  id: string;
  file: File | null;
  preview: string;
  type: "image" | "video";
  order: number;
  isPrimary: boolean;
}

// Downloadable attachments
export interface AttachmentItem {
  id: string;
  file: File | null;
  name: string;
  size?: number;
  url?: string;
  order: number;
}

// Product Form Data Schema
const productFormObjectSchema = z.object({
  // Basic Information
  slug: z.string().optional(),
  nameEn: z.string().min(1, "English name is required"),
  nameAr: z.string().min(1, "Arabic name is required"),
  sku: z.string().optional(),
  record: z.string().optional(),
  status: z.enum(["active", "archived", "updated", "review", "vendor", "store"]).default("active"),
  categoryIds: z.array(z.string()).min(1, "At least one category is required"),
  vendorId: z.string().optional(),
  brandId: z.string().optional(),
  referenceLink: z.string().optional(),
  linked_product_ids: z.array(z.string()).default([]),
  // Quantity is intentionally optional at the object level — it must be
  // possible to clear the input entirely while editing. Requiredness is
  // enforced separately via `createProductFormValidationSchema`'s superRefine
  // so the field can't be left empty on submit.
  quantity: z.number().optional(),
  is_out_of_stock: z.boolean().default(false),
  shortDescriptionEn: z.string().optional(),
  shortDescriptionAr: z.string().optional(),
  longDescriptionEn: z.string().optional(),
  longDescriptionAr: z.string().optional(),
  visible: z.boolean().default(true),
  metaTitleEn: z.string().optional(),
  metaTitleAr: z.string().optional(),
  metaDescriptionEn: z.string().optional(),
  metaDescriptionAr: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // Attributes
  attributes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      values: z.array(
        z.object({
          id: z.string(),
          value: z.string(),
          order: z.number(),
        })
      ).length(1, "Each attribute must have exactly one value"),
      order: z.number(),
    })
  ).optional(),

  specifications: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      values: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          order: z.number(),
        })
      ).min(1, "Each specification must have at least one value"),
      order: z.number(),
    })
  ).optional(),

  // Pricing
  pricing: z.object({
    cost: z.number().min(0).optional(),
    originalVendorPrice: z.number().min(0).optional(),
    originalVendorSalePrice: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
    isSale: z.boolean().optional(),
    salePrice: z.number().min(0).optional(),
  }).optional(),

  // Weight & Dimensions
  weightDimensions: z.object({
    weight: z.number().min(0).optional(),
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    weightUnit: z.enum(WEIGHT_UNITS).optional(),
    dimensionUnit: z.enum(DIMENSION_UNITS).optional(),
  }).optional(),

  // Media
  media: z.array(
    z.object({
      id: z.string(),
      file: z.instanceof(File).nullable(),
      preview: z.string(),
      type: z.enum(["image", "video"]),
      order: z.number(),
      isPrimary: z.boolean(),
    })
  ).min(1, "At least one media item is required"),

  // Optional downloadable files (max 3)
  attachments: z
    .array(
      z.object({
        id: z.string(),
        file: z.instanceof(File).nullable(),
        name: z.string(),
        size: z.number().optional(),
        url: z.string().optional(),
        order: z.number(),
      }),
    )
    .max(3, "You can upload up to 3 files")
    .optional(),

});

export type ProductFormData = z.infer<typeof productFormObjectSchema>;

/**
 * Builds the product form validation schema. Quantity is always required
 * (can't submit with an empty stock value). Pricing's `price` is only
 * required when the current admin has product-pricing access — admins
 * without that access never see the pricing section, so it must be
 * optional for them.
 */
export function createProductFormValidationSchema(
  options: { requirePricing?: boolean } = {}
) {
  const { requirePricing = true } = options;

  return productFormObjectSchema.superRefine((data, ctx) => {
    if (
      data.quantity === undefined ||
      data.quantity === null ||
      Number.isNaN(data.quantity)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["quantity"],
      });
    }

    if (requirePricing) {
      const price = data.pricing?.price;
      if (price === undefined || price === null || Number.isNaN(price)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["pricing", "price"],
        });
      }
    }
  });
}

export function createSimplifiedProductFormValidationSchema() {
  return productFormObjectSchema
    .extend({
      categoryIds: z.array(z.string()).default([]),
      status: z.enum(["active", "archived", "updated", "review", "vendor", "store"]).default("vendor"),
      longDescriptionEn: z.string().min(1, "English description is required"),
      longDescriptionAr: z.string().min(1, "Arabic description is required"),
    })
    .superRefine((data, ctx) => {
      const price = data.pricing?.price;
      if (price === undefined || price === null || Number.isNaN(price)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required",
          path: ["pricing", "price"],
        });
      }
    });
}

export const productFormSchema = createProductFormValidationSchema();

// Form Step
export type FormStep = 1 | 2 | 3 | 4 | 5 | 6;

// Form State
export interface ProductFormState {
  currentStep: FormStep;
  formData: Partial<ProductFormData>;
  isDraft: boolean;
  completionPercentage: number;
  validationErrors: { [key: string]: string };
}

// Predefined Attributes
export const PREDEFINED_ATTRIBUTES = [
  "Color",
  "Size",
  "RAM",
  "Storage",
  "Material",
  "Style",
] as const;

export type PredefinedAttribute = (typeof PREDEFINED_ATTRIBUTES)[number];

// Predefined Attribute Values
export const PREDEFINED_ATTRIBUTE_VALUES: Record<string, string[]> = {
  Color: ["Red", "Blue", "Black", "White", "Green", "Yellow", "Pink", "Purple", "Orange", "Gray"],
  Size: ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
  RAM: ["2GB", "4GB", "6GB", "8GB", "12GB", "16GB", "32GB", "64GB"],
  Storage: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],   
  Material: ["Cotton", "Polyester", "Leather", "Wool", "Silk", "Denim", "Linen"],
  Style: ["Casual", "Formal", "Sport", "Classic", "Modern", "Vintage"],
};
