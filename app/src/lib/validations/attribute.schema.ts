/**
 * Attribute Validation Schemas
 * Shared between client and server for DRY validation
 */

import { z } from "zod";

// Regex patterns for language validation
const ENGLISH_PATTERN = /^[a-zA-Z0-9\s\p{P}]+$/u;
const ARABIC_PATTERN = /^[\u0600-\u06FF0-9\s\p{P}]+$/u;
const HEX_COLOR_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// ============================================
// Attribute Value Schema
// ============================================
export const attributeValueSchema = z.object({
  value_en: z
    .string()
    .min(1, "Required"),
  value_ar: z
    .string()
    .min(1, "Required"),
  parent_value_id: z.union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === "" || val === null || val === undefined) return null;
      return Number(val);
    }),
  color_code: z
    .string()
    .nullable()
    .optional(),
});

// Schema with conditional color validation
export const createAttributeValueSchema = (isColor: boolean) =>
  attributeValueSchema.superRefine((data, ctx) => {
    if (isColor && (!data.color_code || data.color_code.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required",
        path: ["color_code"],
      });
    }
    if (isColor && data.color_code && !HEX_COLOR_PATTERN.test(data.color_code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid hex color format (e.g., #FF0000)",
        path: ["color_code"],
      });
    }
  });

// Type inference
export type AttributeValueFormData = z.input<typeof attributeValueSchema>;
export type AttributeValueFormOutput = z.output<typeof attributeValueSchema>;

// ============================================
// Attribute Schema
// ============================================
export const attributeSchema = z.object({
  name_en: z
    .string()
    .min(1, "Required")
    .regex(ENGLISH_PATTERN, "Must be in English"),
  name_ar: z
    .string()
    .min(1, "Required"),
  unit_en: z.string().optional().nullable(),
  unit_ar: z.string().optional().nullable(),
  parent_id: z.union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === "" || val === null || val === undefined) return null;
      return Number(val);
    }),
  parent_value_id: z.union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === "" || val === null || val === undefined) return null;
      return Number(val);
    }),
  is_color: z.boolean(),
  for_all_categories: z.boolean().optional().default(false),
  allow_ai_inference: z.boolean().optional().default(false),
  is_active: z.boolean(),
  attribute_type: z.enum(["spec_attribute", "variant_attribute"]).optional().nullable(),
  list_separately: z.boolean().optional(),
  category_ids: z.array(z.number()).optional().default([]),
});

// Type inference
export type AttributeFormData = z.input<typeof attributeSchema>;
export type AttributeFormOutput = z.output<typeof attributeSchema>;

// ============================================
// Create Attribute DTO Schema (with values)
// ============================================
export const createAttributeSchema = attributeSchema.extend({
  values: z.array(attributeValueSchema).optional(),
});

export type CreateAttributeFormData = z.infer<typeof createAttributeSchema>;
