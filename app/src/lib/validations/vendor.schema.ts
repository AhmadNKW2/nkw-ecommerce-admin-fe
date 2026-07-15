/**
 * Vendor Validation Schema
 * Shared validation for vendor forms
 */

import { z } from "zod";

// Regex patterns for language validation
const ENGLISH_PATTERN = /^[a-zA-Z0-9\s\p{P}\-_&'".!?,;:()[\]{}@#$%^*+=<>\/\\|`~]+$/u;
const ARABIC_PATTERN = /^[\u0600-\u06FF0-9\s\p{P}\-_&'".!?,;:()[\]{}@#$%^*+=<>\/\\|`~]+$/u;

// ============================================
// Vendor Form Schema
// ============================================
export const vendorFormSchema = z.object({
  name_en: z
    .string()
    .min(1, "English name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(ENGLISH_PATTERN, "Name must be in English"),
  
  name_ar: z
    .string()
    .min(1, "Arabic name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  
  description_en: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .regex(ENGLISH_PATTERN, "Description must be in English")
    .optional()
    .or(z.literal("")),
  
  description_ar: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  
  visible: z.boolean().default(true),
  
  logo: z
    .instanceof(File)
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024,
      "Logo must be less than 5MB"
    )
    .refine(
      (file) => !file || ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"].includes(file.type),
      "Only JPEG, PNG, GIF, WebP, and SVG images are allowed"
    )
    .nullable()
    .optional(),
});

// Create vendor schema (more strict)
export const createVendorSchema = vendorFormSchema.extend({
  name_en: z
    .string()
    .min(1, "English name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  
  name_ar: z
    .string()
    .min(1, "Arabic name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
});

// Update vendor schema (allows partial updates)
export const updateVendorSchema = vendorFormSchema.partial();

// Type inference
export type VendorFormData = z.infer<typeof vendorFormSchema>;
export type CreateVendorFormData = z.infer<typeof createVendorSchema>;
export type UpdateVendorFormData = z.infer<typeof updateVendorSchema>;

// ============================================
// Validation Helper for Simple Forms
// ============================================
export interface VendorFormErrors {
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  logo?: string;
}

/**
 * Validates vendor form data and returns errors object
 */
export function validateVendorForm(data: {
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  logo?: File | null;
}): { isValid: boolean; errors: VendorFormErrors } {
  const errors: VendorFormErrors = {};

  // Name English validation
  if (!data.name_en || !data.name_en.trim()) {
    errors.name_en = "English name is required";
  } else if (data.name_en.length < 2) {
    errors.name_en = "Name must be at least 2 characters";
  } else if (data.name_en.length > 100) {
    errors.name_en = "Name must be less than 100 characters";
  } else if (!ENGLISH_PATTERN.test(data.name_en)) {
    errors.name_en = "Name must be in English";
  }

  // Name Arabic validation
  if (!data.name_ar || !data.name_ar.trim()) {
    errors.name_ar = "Arabic name is required";
  } else if (data.name_ar.length < 2) {
    errors.name_ar = "Name must be at least 2 characters";
  } else if (data.name_ar.length > 100) {
    errors.name_ar = "Name must be less than 100 characters";
  }

  // Description English validation (optional)
  if (data.description_en && data.description_en.length > 1000) {
    errors.description_en = "Description must be less than 1000 characters";
  } else if (data.description_en && !ENGLISH_PATTERN.test(data.description_en)) {
    errors.description_en = "Description must be in English";
  }

  // Description Arabic validation (optional)
  if (data.description_ar && data.description_ar.length > 1000) {
    errors.description_ar = "Description must be less than 1000 characters";
  }

  // Logo validation (optional)
  if (data.logo) {
    if (data.logo.size > 5 * 1024 * 1024) {
      errors.logo = "Logo must be less than 5MB";
    } else if (!["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"].includes(data.logo.type)) {
      errors.logo = "Only JPEG, PNG, GIF, WebP, and SVG images are allowed";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
