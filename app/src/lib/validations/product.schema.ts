/**
 * Product Validation Schemas
 * Shared between client and server for DRY validation
 */

import { z } from "zod";

// Regex patterns for language validation
const ENGLISH_PATTERN = /^[a-zA-Z0-9\s\p{P}]+$/u;
const ARABIC_PATTERN = /^[\u0600-\u06FF0-9\s\p{P}]+$/u;
const isValidUrl = (value?: string) => {
  if (!value) {
    return true;
  }

  return z.string().url().safeParse(value).success;
};

// ============================================
// Basic Information Schema
// ============================================
export const basicInformationSchema = z.object({
  slug: z.string().optional(),
  nameEn: z
    .string()
    .min(1, "Required")
    .regex(ENGLISH_PATTERN, "Must be in English"),
  nameAr: z
    .string()
    .min(1, "Required"),
  status: z.enum(["active", "archived", "updated", "review"]).default("active"),
  categoryIds: z.array(z.string()).min(1, "At least one category is required"),
  vendorId: z.string().min(1, "Required"),
  brandId: z.string().optional().default("").pipe(z.string().min(1, "Required")),
  referenceLink: z.string().optional().refine(isValidUrl, "Must be a valid URL"),
  linked_product_ids: z.array(z.string()).default([]),
  shortDescriptionEn: z
    .string()
    .min(1, "Required")
    .regex(ENGLISH_PATTERN, "Must be in English"),
  shortDescriptionAr: z
    .string()
    .min(1, "Required"),
  longDescriptionEn: z
    .string()
    .min(1, "Required")
    .regex(ENGLISH_PATTERN, "Must be in English"),
  longDescriptionAr: z
    .string()
    .min(1, "Required"),
  visible: z.boolean().default(true),
});

// ============================================
// Attribute Schema (for product form)
// ============================================
export const productAttributeValueSchema = z.object({
  id: z.string(),
  value: z.string(),
  order: z.number(),
});

export const productAttributeSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(productAttributeValueSchema).length(1, "Each attribute must have exactly one value"),
  order: z.number(),
});

export const productSpecificationSelectionValueSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
});

export const productSpecificationSelectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(productSpecificationSelectionValueSchema).min(1, "Each specification must have at least one value"),
  order: z.number(),
});

// ============================================
// Pricing Schemas
// ============================================
export const singlePricingSchema = z.object({
  cost: z.number().min(0, "Must be 0 or greater").optional(),
  price: z.number({ message: "Required" }).min(0, "Must be 0 or greater"),
  isSale: z.boolean().optional().default(true),
  salePrice: z.number().min(0, "Must be 0 or greater").optional(),
});

export const variantPricingSchema = z.object({
  key: z.string(),
  attributeValues: z.record(z.string(), z.string()),
  cost: z.number().min(0, "Must be 0 or greater").optional(),
  price: z.number({ message: "Required" }).min(0, "Must be 0 or greater"),
  isSale: z.boolean().optional().default(true),
  salePrice: z.number().min(0, "Must be 0 or greater").optional(),
});

// ============================================
// Weight & Dimensions Schemas
// ============================================
export const weightDimensionsSchema = z.object({
  weight: z.number().min(0, "Must be 0 or greater").optional(),
  length: z.number().min(0, "Must be 0 or greater").optional(),
  width: z.number().min(0, "Must be 0 or greater").optional(),
  height: z.number().min(0, "Must be 0 or greater").optional(),
  unit: z.string().optional(),
});

export const variantWeightDimensionsSchema = weightDimensionsSchema.extend({
  key: z.string(),
  attributeValues: z.record(z.string(), z.string()),
});

// ============================================
// Media Schemas
// ============================================
export const mediaItemSchema = z.object({
  id: z.string(),
  file: z.instanceof(File).nullable(),
  preview: z.string(),
  type: z.enum(["image", "video"]),
  order: z.number(),
  isPrimary: z.boolean(),
});

export const variantMediaSchema = z.object({
  key: z.string(),
  attributeValues: z.record(z.string(), z.string()),
  media: z.array(mediaItemSchema).min(1, "Required"),
});

// ============================================
// Stock Schema
// ============================================
export const variantCombinationSchema = z.object({
  id: z.string(),
  attributeValues: z.record(z.string(), z.string()),
  is_out_of_stock: z.boolean().default(false),
  active: z.boolean().optional(),
});

// ============================================
// Dynamic Product Form Schema Builder
// ============================================

export interface ProductFormConfig {
  hasPricingAttributes: boolean;
  isWeightVariantBased: boolean;
  isMediaVariantBased: boolean;
  singlePricingIsSale: boolean;
  variantPricingItems: { isSale: boolean }[];
  expectedPricingCount: number;
  expectedWeightCount: number;
  expectedMediaCount: number;
}

/**
 * Creates a dynamic Zod schema based on the current form state
 */
export const createProductSchema = (config: ProductFormConfig) => {
  // Base schema with required fields
  let schema = z.object({
    // Basic Information - always required
    slug: z.string().optional(),
    nameEn: z.string().min(1, "Required"),
    nameAr: z.string().min(1, "Required"),
    status: z.enum(["active", "archived", "updated", "review"]).default("active"),
    categoryIds: z.array(z.string()).min(1, "At least one category is required"),
    vendorId: z.string().min(1, "Required"),
    brandId: z.string().optional().default("").pipe(z.string().min(1, "Required")),
    referenceLink: z.string().optional().refine(isValidUrl, "Must be a valid URL"),
    linked_product_ids: z.array(z.string()).default([]),
    shortDescriptionEn: z.string().min(1, "Required"),
    shortDescriptionAr: z.string().min(1, "Required"),
    longDescriptionEn: z.string().min(1, "Required"),
    longDescriptionAr: z.string().min(1, "Required"),
    visible: z.boolean().default(true),
    quantity: z.number().min(0, "Must be 0 or greater").optional().default(0),
    is_out_of_stock: z.boolean().default(false),

    // Attributes - optional
    attributes: z.array(productAttributeSchema).optional(),
    specifications: z.array(productSpecificationSelectionSchema).optional(),

    // Flags
    isWeightVariantBased: z.boolean().default(false),
    isMediaVariantBased: z.boolean().default(false),

    // Variants - stock
    variants: z.array(variantCombinationSchema).optional(),
  });

  // Variant pricing no longer used, force single pricing
  schema = schema.extend({
    singlePricing: singlePricingSchema,
    variantPricing: z.array(variantPricingSchema).optional(),
  });

  // Weight/dimensions validation - variants removed
  schema = schema.extend({
    singleWeightDimensions: weightDimensionsSchema.optional(),
    variantWeightDimensions: z.array(variantWeightDimensionsSchema).optional(),
  });

  // Media validation - variants removed
  schema = schema.extend({
    singleMedia: z.array(mediaItemSchema).min(1, "Required"),
    variantMedia: z.array(variantMediaSchema).optional(),
  });

  return schema;
};

// Type inference from the base schema pattern
export type ProductFormData = z.infer<typeof basicInformationSchema> & {
  attributes?: z.infer<typeof productAttributeSchema>[];
  singlePricing?: z.infer<typeof singlePricingSchema>;
  variantPricing?: z.infer<typeof variantPricingSchema>[];
  isWeightVariantBased: boolean;
  singleWeightDimensions?: z.infer<typeof weightDimensionsSchema>;
  variantWeightDimensions?: z.infer<typeof variantWeightDimensionsSchema>[];
  isMediaVariantBased: boolean;
  singleMedia?: z.infer<typeof mediaItemSchema>[];
  variantMedia?: z.infer<typeof variantMediaSchema>[];
  variants?: z.infer<typeof variantCombinationSchema>[];
};
