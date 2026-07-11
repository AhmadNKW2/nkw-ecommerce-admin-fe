/**
 * Single Page Product Form Component
 * All sections in one scrollable page
 * Uses Zod for validation
 */

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useProductFormDraft } from "../../hooks/use-product-form-draft";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";
import { STOREFRONT_CONFIG } from "../../lib/constants";
import { useAttributes } from "../../services/attributes/hooks/use-attributes";
import { useSpecifications } from "../../services/specifications/hooks/use-specifications";
import { useResolvedFeatureToggles } from "../../hooks/use-resolved-feature-toggles";
import { useAdminAccess } from "../../hooks/use-admin-access";
import { Button } from "../ui/button";
import { PageHeader } from "../common/PageHeader";
import {
  ProductFormData,
  createProductFormValidationSchema,
  Attribute,
  ProductSpecificationSelection
} from "../../services/products/types/product-form.types";
import { BasicInformationSection } from "./sections/BasicInformationSection";
import { AttributesSection } from "./sections/AttributesSection";
import { SpecificationsSection } from "./sections/SpecificationsSection";
import { PricingSection } from "./sections/PricingSection";
import { WeightDimensionsSection } from "./sections/WeightDimensionsSection";
import { MediaSection } from "./sections/MediaSection";
import { AttachmentsSection } from "./sections/AttachmentsSection";
import { StockSection } from "./sections/StockSection";
import { Card } from "../ui";
import { useZodValidation, flattenZodErrors } from "../../hooks/use-zod-validation";
import { Package } from "lucide-react";
import type { Attribute as CatalogAttribute, AttributeValue as CatalogAttributeValue } from "../../services/attributes/types/attribute.types";
import { Category } from "../../services/categories/types/category.types";
import type { Specification as CatalogSpecification, SpecificationValue as CatalogSpecificationValue } from "../../services/specifications/types/specification.types";
import type { LinkedProductSummary } from "../../services/products/types/product.types";
import {
    generateCombinations,
    
} from "../../services/products/utils/variant-combinations";

interface ProductFormProps {
  productId?: string;
  initialData?: Partial<ProductFormData>;
  isEditMode?: boolean;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onSaveDraft?: (data: Partial<ProductFormData>) => Promise<void>;
  categories?: Category[];
  vendors?: Array<{ id: string; name: string; nameEn?: string; nameAr?: string }>;
  brands?: Array<{ id: string; name: string; nameEn?: string; nameAr?: string }>;
  attributes?: Array<{ id: string; name: string; displayName: string; values: Array<{ id: string; value: string; displayValue: string }> }>;
  specifications?: Array<{ id: string; name: string; displayName: string; parentId?: string; parentValueId?: string; values: Array<{ id: string; value: string; displayValue: string; parentId?: string }> }>;
  initialLinkedProducts?: LinkedProductSummary[];
}

type AvailableAttributeOption = NonNullable<ProductFormProps["attributes"]>[number];
type AvailableSpecificationOption = NonNullable<ProductFormProps["specifications"]>[number];

const mapAttributeDefinitions = (
  attributeDefinitions: CatalogAttribute[] | undefined
): AvailableAttributeOption[] => {
  return (
    attributeDefinitions?.map((attribute) => ({
      id: attribute.id.toString(),
      parentId: attribute.parent_id?.toString(),
      parentValueId: attribute.parent_value_id?.toString(),
      name: attribute.name_en,
      displayName: attribute.name_ar,
      values:
        attribute.values?.map((value: CatalogAttributeValue) => ({
          id: value.id.toString(),
          parentId: value.parent_value_id?.toString(),
          value: value.value_en,
          displayValue: value.value_ar,
        })) || [],
    })) || []
  );
};

const mapSpecificationDefinitions = (
  specificationDefinitions: CatalogSpecification[] | undefined
): AvailableSpecificationOption[] => {
  return (
    specificationDefinitions?.map((specification) => ({
      id: specification.id.toString(),
      parentId: specification.parent_id?.toString(),
      parentValueId: specification.parent_value_id?.toString(),
      name: specification.name_en,
      displayName: specification.name_ar,
      values: specification.values.map((value: CatalogSpecificationValue) => ({
        id: value.id.toString(),
        parentId: value.parent_value_id?.toString(),
        value: value.value_en,
        displayValue: value.value_ar,
      })),
    })) || []
  );
};

export const ProductForm: React.FC<ProductFormProps> = ({
  productId,
  initialData = {},
  isEditMode = false,
  onSubmit,
  onSaveDraft,
  categories = [],
  vendors = [],
  brands = [],
  attributes = [],
  specifications = [],
  initialLinkedProducts = [],
}) => {
  const router = useRouter();

  // Feature toggles — hide gated sections until settings are resolved to avoid
  // a flash of enabled fields that disappear after the API responds.
  const { isEnabled } = useResolvedFeatureToggles();
  const vendorsEnabled = isEnabled("vendors_enabled");
  const attributesEnabled = isEnabled("attributes_enabled");
  const specificationsEnabled = isEnabled("specifications_enabled");
  const weightAndDimensionsEnabled = isEnabled("weight_and_dimensions_enabled");
  const referenceLinksEnabled = isEnabled("reference_links_enabled");
  const referenceLinkVisible = isEnabled("reference_link_visible_admin");
  const metaTitleVisible = isEnabled("meta_title_visible_admin");
  const metaDescriptionVisible = isEnabled("meta_description_visible_admin");
  const importAiProductsEnabled = isEnabled("import_ai_products_enabled");
  const linkedProductsEnabled =
    vendorsEnabled && isEnabled("linked_products_enabled");
  const productStatusEnabled = isEnabled("product_status_enabled");
  const statusVisible = productStatusEnabled;
  const { canEditProductPricing } = useAdminAccess();

  // Draft persistence – only active in create mode.
  const { restoredDraft, saveDraft, clearDraft } = useProductFormDraft({
    enabled: !isEditMode,
  });

  const [formData, setFormData] = useState<Partial<ProductFormData>>({
    nameEn: "",
    nameAr: "",
    sku: "",
    record: "",
    status: "active",
    categoryIds: [],
    vendorId: "",
    brandId: "",
    referenceLink: "",
    linked_product_ids: [],
    quantity: undefined,
    is_out_of_stock: false,
    shortDescriptionEn: "",
    shortDescriptionAr: "",
    longDescriptionEn: "",
    longDescriptionAr: "",
    visible: true,
    metaTitleEn: "",
    metaTitleAr: "",
    metaDescriptionEn: "",
    metaDescriptionAr: "",
    tags: [],
    attributes: [],
    specifications: [],
    media: [],
    attachments: [],
    ...initialData,
    // Overlay any previously saved draft (create mode only; ignored when
    // restoredDraft is null or when initialData already provides values).
    ...(!isEditMode && restoredDraft ? restoredDraft : {}),
  });

  const selectedCategoryIds = formData.categoryIds || [];
  const categoryIdsQuery = useMemo(() => {
    const uniqueIds = Array.from(new Set(selectedCategoryIds.filter(Boolean)));
    return uniqueIds.length > 0 ? uniqueIds.join(",") : undefined;
  }, [selectedCategoryIds]);
  const hasSelectedCategories = !!categoryIdsQuery;

  const { data: filteredAttributesData, isLoading: filteredAttributesLoading } = useAttributes(
    categoryIdsQuery ? { category_ids: categoryIdsQuery } : undefined,
    { enabled: hasSelectedCategories }
  );
  const { data: filteredSpecificationsData, isLoading: filteredSpecificationsLoading } = useSpecifications(
    categoryIdsQuery ? { category_ids: categoryIdsQuery } : undefined,
    { enabled: hasSelectedCategories }
  );

  const filteredAttributeOptions = useMemo(
    () => mapAttributeDefinitions(filteredAttributesData as CatalogAttribute[] | undefined),
    [filteredAttributesData]
  );
  const filteredSpecificationOptions = useMemo(
    () => mapSpecificationDefinitions(filteredSpecificationsData as CatalogSpecification[] | undefined),
    [filteredSpecificationsData]
  );
  const availableAttributeOptions = hasSelectedCategories ? filteredAttributeOptions : [];
  const availableSpecificationOptions = hasSelectedCategories ? filteredSpecificationOptions : [];
  const attributeDefinitionsForLogic = useMemo(
    () => (availableAttributeOptions.length > 0 ? availableAttributeOptions : attributes),
    [availableAttributeOptions, attributes]
  );

  // Auto-save draft to localStorage on every formData change (create mode only).
  useEffect(() => {
    if (!isEditMode) {
      saveDraft(formData);
    }
  }, [formData, isEditMode, saveDraft]);

  // Update formData when initialData changes (for edit mode)
  // Use JSON.stringify to create a stable dependency
  const initialDataJson = JSON.stringify(initialData);
  React.useEffect(() => {
    if (isEditMode && initialData && Object.keys(initialData).length > 0) {
      setFormData({
        nameEn: "",
        nameAr: "",
        sku: "",
        record: "",
        status: "active",
        categoryIds: [],
        vendorId: "",
        brandId: "",
        referenceLink: "",
        linked_product_ids: [],
        quantity: undefined,
        is_out_of_stock: false,
        shortDescriptionEn: "",
        shortDescriptionAr: "",
        longDescriptionEn: "",
        longDescriptionAr: "",
        visible: true,
        metaTitleEn: "",
        metaTitleAr: "",
        metaDescriptionEn: "",
        metaDescriptionAr: "",
        tags: [],
        attributes: [],
        specifications: [],
        media: [],
        attachments: [],
        ...initialData,
      });
    }
  }, [isEditMode, initialDataJson]);

  // Build dynamic Zod schema based on form state — pricing is only
  // required when this admin has product-pricing access.
  const zodSchema = React.useMemo(
    () => createProductFormValidationSchema({ requirePricing: canEditProductPricing }),
    [canEditProductPricing]
  );
  
  const { errors, validateForm, validateField, clearFieldError, isSubmitted } = useZodValidation<ProductFormData>({
    schema: zodSchema,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Cast to ProductFormData for validation (with defaults)
    let dataToValidate: ProductFormData = {
      slug: formData.slug || undefined,
      nameEn: formData.nameEn || '',
      nameAr: formData.nameAr || '',
      sku: formData.sku || '',
      record: formData.record || '',
      status: productStatusEnabled ? (formData.status || 'active') : 'active',
      categoryIds: formData.categoryIds || [],
      vendorId: formData.vendorId || '',
      brandId: formData.brandId || '',
      referenceLink: formData.referenceLink || '',
      linked_product_ids: linkedProductsEnabled ? (formData.linked_product_ids || []) : [],
      quantity: formData.quantity,
      is_out_of_stock: formData.is_out_of_stock || false,
      shortDescriptionEn: formData.shortDescriptionEn || '',
      shortDescriptionAr: formData.shortDescriptionAr || '',
      longDescriptionEn: formData.longDescriptionEn || '',
      longDescriptionAr: formData.longDescriptionAr || '',
      visible: formData.visible ?? true,
      metaTitleEn: formData.metaTitleEn || '',
      metaTitleAr: formData.metaTitleAr || '',
      metaDescriptionEn: formData.metaDescriptionEn || '',
      metaDescriptionAr: formData.metaDescriptionAr || '',
      tags: formData.tags || [],
      attributes: formData.attributes,
      specifications: formData.specifications,
      pricing: formData.pricing,
      weightDimensions: formData.weightDimensions,
      media: formData.media || [],
    };

    // -----------------------------------------------------
    // HIERARCHICAL ATTRIBUTE SPLITTING LOGIC (Expanded)
    // -----------------------------------------------------
    // If we have "Level 0" attributes that imply child attributes
    // (e.g. CPU -> Intel > Celeron > N4500), we must split them into
    // separate attribute entries before validation and submission.
    // ALSO: We must expand the variant definitions to include these new attribute/value pairs.
    // -----------------------------------------------------
    if (dataToValidate.attributes && dataToValidate.attributes.length > 0) {
       const splitAttributes: Attribute[] = [];
       // Track attribute IDs we have already added to avoid duplicates
       const addedAttributeIds = new Set<string>();
       
       // Map of Leaf Value ID -> Map of implied { AttrID -> ValueID }
       // This is used to patch the variant combinations later
       const expansionMap = new Map<string, Record<string, string>>();

       dataToValidate.attributes.forEach(attr => {
           // We only process this attribute if it has values.
           if (attr.values.length === 0) {
               if (!addedAttributeIds.has(attr.id)) {
                  splitAttributes.push(attr);
                  addedAttributeIds.add(attr.id);
               }
               return;
           }

           // Check each selected value to see if it belongs to a hierarchy
           // We need to look up the system definition for the selected values.
           const systemAttr = attributeDefinitionsForLogic.find(a => a.id === attr.id);
           
           if (!systemAttr) {
              // Just keep as is if not found in system
              if (!addedAttributeIds.has(attr.id)) {
                 splitAttributes.push(attr);
                 addedAttributeIds.add(attr.id);
              }
              return;
           }

           // We need to collect "implied" attributes from the selected values.
           // Map<AttributeId, Set<ValueId>>
           const impliedSelections = new Map<string, Set<string>>();
           
           // Initialize with current attribute (Level 0)
           if (!impliedSelections.has(attr.id)) impliedSelections.set(attr.id, new Set());

           attr.values.forEach(val => {
               // The ID in `val.id` is the LEAF ID (e.g. N4500 id=40).
               // We need to traverse UP from this ID to finding all parents.
               
               let currentId = val.id;
               let depth = 0;
               const chain: {attrId: string, valId: string}[] = [];

               // Helper to find a value definition and its attribute in the system list
               // This is O(Attributes * Values), might be slow if list is huge.
               while(currentId && depth < 10) {
                   let found = false;
                   for(const sysA of attributeDefinitionsForLogic) {
                       const sysV = sysA.values.find(v => v.id === currentId);
                       if (sysV) {
                           chain.unshift({ attrId: sysA.id, valId: sysV.id });
                           // Find parent value ID
                           // Note: AttributeSection handles `parentValueId` or `parentId` property mapping 
                           // But here `attributes` prop is raw from parent component.
                           const pvId = (sysV as any).parentValueId ?? (sysV as any).parentId ?? (sysV as any).parent_value_id;
                           currentId = pvId;
                           found = true;
                           break;
                       }
                   }
                   if (!found) break;
                   depth++;
               }

               // Register this chain in the expansion map for this leaf value
               const chainRecord: Record<string, string> = {};
               chain.forEach(item => {
                   chainRecord[item.attrId] = item.valId;
               });
               expansionMap.set(val.id, chainRecord);

               // Add the chain to implied selections for attribute splitting
               chain.forEach(item => {
                   if (!impliedSelections.has(item.attrId)) {
                       impliedSelections.set(item.attrId, new Set());
                   }
                   impliedSelections.get(item.attrId)?.add(item.valId);
               });
           });

           // Now convert the map back to Attribute objects
           impliedSelections.forEach((valIds, attrId) => {
                   const sysA = attributeDefinitionsForLogic.find(a => a.id === attrId);
               // Inherit control flags from the root attribute
               const controlFlags = {
                   
               };

               if (addedAttributeIds.has(attrId)) {
                   // If already added (e.g. by another root?), merge values?
                   const existing = splitAttributes.find(a => a.id === attrId);
                   if (existing) {
                       // Add new values that aren't there
                       valIds.forEach(vid => {
                           if (!existing.values.some(v => v.id === vid)) {
                               // Find value def to get correct value string
                               const sysV = sysA?.values.find(v => v.id === vid);
                               existing.values.push({
                                   id: vid,
                                   value: sysV?.value || '',
                                   order: existing.values.length
                               }); 
                           }
                       });
                   }
               } else {
                   // Create new attribute entry
                   if (sysA) {
                       const values = Array.from(valIds).map((vid, idx) => {
                           const sysV = sysA.values.find(v => v.id === vid);
                           return {
                               id: vid,
                               value: sysV?.value || '',
                               order: idx
                           };
                       });
                       
                       splitAttributes.push({
                           ...attr, // Base properties
                           ...controlFlags, // Explicit control flags
                           id: attrId,
                           name: sysA.name, // Use actual name of the level (e.g. "CPU Model")
                           values
                       });
                       addedAttributeIds.add(attrId);
                   }
               }
           });
       });

       dataToValidate = {
           ...dataToValidate,
           attributes: splitAttributes
       };

       // Now EXPAND the variant combinations using expansionMap
       // We iterate over all arrays that use `attributeValues`
       
       const expandAttributeValues = <T extends { attributeValues: Record<string, string>, key?: string }>(items: T[] | undefined): T[] => {
            if (!items) return [];
            return items.map(item => {
                const newAttrValues = { ...item.attributeValues };
                let modified = false;

                // For each value in the variant, check if it's a leaf that implies other values
                Object.entries(item.attributeValues).forEach(([attrId, valId]) => {
                    const expanded = expansionMap.get(valId);
                    if (expanded) {
                        // Merge expanded values (e.g. {10:29, 11:30, 12:40})
                        Object.assign(newAttrValues, expanded);
                        modified = true;
                    }
                });

                if (!modified) return item;

                // If key exists, we might need to regenerate it, but usually key is internal.
                // However, updated attributeValues is what matters to backend.
                return {
                    ...item,
                    attributeValues: newAttrValues
                };
            });
       };
       
       [] = expandAttributeValues([]);
       [] = expandAttributeValues([]);
       [] = expandAttributeValues([]);
       // Stocks
    }

    const normalizedData = dataToValidate;

    const isValid = validateForm(normalizedData);

    if (!isValid) {
      
      const result = zodSchema.safeParse(normalizedData);
      if (!result.success) {
        console.log('=== ZOD ERRORS ===', JSON.stringify(result.error.format(), null, 2));
        const newErrors = flattenZodErrors(result.error);
        const firstErrorField = Object.keys(newErrors)[0];
        
        if (firstErrorField) {
            setTimeout(() => {
                const element = document.getElementById(firstErrorField);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Try to focus if it's an input
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT' || element.getAttribute('tabindex')) {
                        element.focus({ preventScroll: true });
                    }
                } else {
                    console.warn(`Could not find element for error: ${firstErrorField}`);
                     // Fallback for some known fields that might be wrapped or have different ID logic
                     // e.g. singleMedia container has id="singleMedia" but error is singleMedia
                     const fallbackElement = document.getElementById(firstErrorField.split('.')[0]);
                     if (fallbackElement) {
                         fallbackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                     } else {
                         // Scroll to top as last resort
                         window.scrollTo({ top: 0, behavior: 'smooth' });
                     }
                }
            }, 100);
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(normalizedData);
      // Product created successfully – clear the persisted draft.
      clearDraft();
    } catch (error) {
      console.error("Failed to submit form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    // DEBUG: Log field changes for media
    if (field === 'singleMedia' || field === 'variantMedia' || field === 'isMediaVariantBased') {
      if (field === 'singleMedia' && Array.isArray(value)) {
        value.forEach((item: any, idx: number) => {
        });
      }
    }

    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // DEBUG: Log updated form data for media fields
      if (field === 'singleMedia' || field === 'variantMedia' || field === 'isMediaVariantBased') {
      }

      return newData;
    });
    
    // Clear field error when value changes (after submission)
    if (isSubmitted) {
      clearFieldError(field);
    }
  };

  const handleStockChange = (variants: []) => {
    setFormData((prev) => {
      // 1. Calculate new attributes based on remaining variants
      const currentAttributes = prev.attributes || [];
      
      // If no attributes, just update variants
      if (currentAttributes.length === 0) {
        return { ...prev, variants };
      }

      const updatedAttributes = currentAttributes.map((attr) => {
        // Find all values of this attribute that are currently used in the new variants list
        const usedValueIds = new Set();

        // Keep only values that are used
        const newValues = attr.values.filter((val) => usedValueIds.has(val.id));

        return {
          ...attr,
          values: newValues,
        };
      });

      return {
        ...prev,
        variants,
        attributes: updatedAttributes,
      };
    });
  };

  const calculateSalePercentage = (price: number, salePrice?: number) => {
    if (!salePrice || salePrice >= price) return 0;
    return Math.round(((price - salePrice) / price) * 100);
  };

  useEnterToSubmit(handleSubmit, isSubmitting);

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Package />}
        title={isEditMode ? (
          <span className="flex items-center gap-2">
            Edit Product
            {productId && <span className="text-primary">#{productId}</span>}
          </span>
        ) : "Create New Product"}
        description={isEditMode ? "Update product information" : "Fill in the details to create a new product"}
        extraActions={
          isEditMode && formData.slug ? (
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                window.open(
                  `${STOREFRONT_CONFIG.baseUrl}/products/${formData.slug}`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              Preview Product
            </Button>
          ) : undefined
        }
        cancelAction={{
          label: "Cancel",
          onClick: () => { clearDraft(); router.push('/products'); },
          disabled: isSubmitting,
        }}
        action={{
          label: isSubmitting ? "Submitting..." : (isEditMode ? "Update Product" : "Create Product"),
          onClick: handleSubmit,
          disabled: isSubmitting,
        }}
      />
      {/* Basic Information */}
      <BasicInformationSection
        formData={{
          nameEn: formData.nameEn,
          nameAr: formData.nameAr,
          sku: formData.sku,
          record: formData.record,
          status: formData.status,
          categoryIds: formData.categoryIds,
          vendorId: formData.vendorId,
          brandId: formData.brandId,
          referenceLink: formData.referenceLink,
          linked_product_ids: formData.linked_product_ids,
          shortDescriptionEn: formData.shortDescriptionEn,
          shortDescriptionAr: formData.shortDescriptionAr,
          longDescriptionEn: formData.longDescriptionEn,
          longDescriptionAr: formData.longDescriptionAr,
          visible: formData.visible,
          metaTitleEn: formData.metaTitleEn,
          metaTitleAr: formData.metaTitleAr,
          metaDescriptionEn: formData.metaDescriptionEn,
          metaDescriptionAr: formData.metaDescriptionAr,
          tags: formData.tags,
        }}
        errors={errors}
        categories={categories}
        vendors={vendors}
        brands={brands}
        onChange={handleFieldChange}
        currentProductId={productId}
        initialLinkedProducts={initialLinkedProducts}
        vendorsEnabled={vendorsEnabled}
        referenceLinkVisible={referenceLinkVisible}
        referenceLinkActionsEnabled={referenceLinksEnabled}
        metaTitleVisible={metaTitleVisible}
        metaDescriptionVisible={metaDescriptionVisible}
        statusVisible={statusVisible}
        linkedProductsEnabled={linkedProductsEnabled}
      />

      {/* Attributes Configuration — hidden when attributes_enabled is false */}
      {attributesEnabled && (
      <AttributesSection
        attributes={formData.attributes || []}
        availableAttributes={availableAttributeOptions}
        categoriesSelected={hasSelectedCategories}
        isLoadingAvailableAttributes={filteredAttributesLoading}
        onChange={(attributes: Attribute[], resetType?: 'pricing' | 'weight' | 'media' | 'stock' | 'all') => {
          const hasWeight = false;
          const hasMedia = false;
          const hasAttributes = attributes.length > 0;

          setFormData(prev => {
            const updates: Partial<ProductFormData> = {
              ...prev,
              attributes,
              
              
            };

            const prevAttributes = prev.attributes || [];
            let shouldClearMedia = false;
            let shouldClearPricing = false;
            let shouldClearWeight = false;

            prevAttributes.forEach(pa => {
              const na = attributes.find(a => a.id === pa.id);
              if (!na) {
                // Attribute removed
                if (pa.values.length > 1) {


                }
              } else {
                // Attribute control toggled off
                if (pa.values.length > 1) {


                }
              }
            });

                                    
            // If switching to single (no attributes), reset all variant data
            

            // Let StockSection and other sections automatically reconcile 
            // the data with the updated attributes via their internal logic 
            // and the `getVariantData` fallback logic, preserving existing valid entries.

            return updates as ProductFormData;
          });
          // Clear attribute errors when changed
          if (isSubmitted) {
            clearFieldError("attributes");
          }
        }}
        errors={errors}
      />
      )}

      {specificationsEnabled && (
      <SpecificationsSection
        specifications={formData.specifications || []}
        availableSpecifications={availableSpecificationOptions}
        categoriesSelected={hasSelectedCategories}
        isLoadingAvailableSpecifications={filteredSpecificationsLoading}
        onChange={(nextSpecifications: ProductSpecificationSelection[]) => {
          handleFieldChange("specifications", nextSpecifications);
          if (isSubmitted) {
            clearFieldError("specifications");
          }
        }}
        errors={errors}
      />
      )}

      {/* Stock Management */}
      <StockSection
          quantity={formData.quantity}
          isOutOfStock={formData.is_out_of_stock || false}
          onChangeQuantity={(q) => handleFieldChange("quantity", q)}
          onChangeIsOutOfStock={(isOut) => handleFieldChange("is_out_of_stock", isOut)}
          errors={errors}
        />

      {/* Pricing Configuration */}
      {canEditProductPricing ? (
      <PricingSection
        pricing={formData.pricing}
        onChange={(pricing) => handleFieldChange("pricing", pricing)}
        calculateSalePercentage={calculateSalePercentage}
        errors={errors}
        vendorSourcePricesVisible={vendorsEnabled}
      />
      ) : null}

      {/* Weight & Dimensions — hidden when weight_and_dimensions_enabled is false */}
      {weightAndDimensionsEnabled && (
      <WeightDimensionsSection
        weightDimensions={formData.weightDimensions}
        onChange={(data) => handleFieldChange("weightDimensions", data)}
        errors={errors}
      />
      )}

      {/* Media Management */}
      <MediaSection
        media={formData.media || []}
        onChange={(media) => handleFieldChange("media", media)}
        errors={errors}
      />

      <AttachmentsSection
        attachments={formData.attachments || []}
        onChange={(attachments) => handleFieldChange("attachments", attachments)}
        errors={errors}
      />
    </div>
  );
};
