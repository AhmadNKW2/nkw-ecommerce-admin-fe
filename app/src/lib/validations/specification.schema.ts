/**
 * Specification Validation Schemas
 */

import { z } from "zod";

const ENGLISH_PATTERN = /^[a-zA-Z0-9\s\p{P}]+$/u;

export const specificationValueSchema = z.object({
  value_en: z
    .string()
    .min(1, "Required"),
  value_ar: z
    .string()
    .min(1, "Required"),
  parent_value_id: z.union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      return Number(value);
    }),
});

export const createSpecificationValueSchema = () => specificationValueSchema;

export type SpecificationValueFormData = z.input<typeof specificationValueSchema>;
export type SpecificationValueFormOutput = z.output<typeof specificationValueSchema>;

export const specificationSchema = z.object({
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
    .transform((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      return Number(value);
    }),
  parent_value_id: z.union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      return Number(value);
    }),
  for_all_categories: z.boolean().optional().default(false),
  allow_ai_inference: z.boolean().optional().default(false),
  category_ids: z.array(z.number()).optional().default([]),
  list_separately: z.boolean().optional().default(false),
  is_active: z.boolean().default(true),
});

export type SpecificationFormData = z.input<typeof specificationSchema>;
export type SpecificationFormOutput = z.output<typeof specificationSchema>;

export const createSpecificationSchema = specificationSchema.extend({
  values: z.array(specificationValueSchema).optional(),
});

export type CreateSpecificationFormData = z.infer<typeof createSpecificationSchema>;