/**
 * Edit Product Page
 * Page for editing existing products
 */

"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { ProductForm } from "../../src/components/products/ProductForm";
import { ProductFormData } from "../../src/services/products/types/product-form.types";
import {
  LinkedProductSummary,
  ProductDetail,
  ProductSpecification as ProductSpecificationMap,
  UpdateProductDto,
} from "../../src/services/products/types/product.types";
import { useCategories } from "../../src/services/categories/hooks/use-categories";
import { useVendors } from "../../src/services/vendors/hooks/use-vendors";
import { useBrands } from "../../src/services/brands/hooks/use-brands";
import { useAttributes } from "../../src/services/attributes/hooks/use-attributes";
import { useSpecifications } from "../../src/services/specifications/hooks/use-specifications";
import { useProduct } from "../../src/services/products/hooks/use-products";
import { productService } from "../../src/services/products/api/product.service";
import { mediaService } from "../../src/services/media/api/media.service";
import {
  buildMediaArray,
  buildAttachmentsArray,
  transformFormDataToDto,
  UploadedMediaReference,
  UploadedAttachmentReference,
} from "../../src/services/products/form/transform";
import { Card } from "../../src/components/ui/card";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "../../src/components/ui/button";
import {
  Attribute,
  AttributeValue,
} from "../../src/services/attributes/types/attribute.types";
import {
  Specification,
  SpecificationValue,
} from "../../src/services/specifications/types/specification.types";
import {
  finishToastError,
  finishToastSuccess,
  showLoadingToast,
  updateLoadingToast,
} from "../../src/lib/toast";

type NormalizedProductSpecification = {
  specification_value_id: number;
  specification_value: SpecificationValue;
};

const parseOptionalNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const normalizeProductTags = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((tag) => {
          if (typeof tag === "string") {
            return tag.trim();
          }

          if (tag && typeof tag === "object") {
            const record = tag as Record<string, unknown>;
            return String(
              record.name ?? record.label ?? record.slug ?? "",
            ).trim();
          }

          return "";
        })
        .filter(Boolean),
    ),
  );
};

const normalizeProductSpecificationEntry = (
  entry: unknown,
  fallbackSpecificationId?: number,
  fallbackSortOrder = 0,
): NormalizedProductSpecification | null => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  const rawValue =
    "specification_value" in candidate &&
    candidate.specification_value &&
    typeof candidate.specification_value === "object"
      ? (candidate.specification_value as Record<string, unknown>)
      : candidate;

  const specificationValueId = Number(
    candidate.specification_value_id ?? rawValue.id,
  );
  const specificationId = Number(
    rawValue.specification_id ?? fallbackSpecificationId,
  );

  if (Number.isNaN(specificationValueId) || Number.isNaN(specificationId)) {
    return null;
  }

  return {
    specification_value_id: specificationValueId,
    specification_value: {
      id: specificationValueId,
      specification_id: specificationId,
      value_en: String(rawValue.value_en ?? rawValue.name_en ?? ""),
      value_ar: String(rawValue.value_ar ?? rawValue.name_ar ?? ""),
      parent_value_id:
        rawValue.parent_value_id === undefined ||
        rawValue.parent_value_id === null
          ? null
          : Number(rawValue.parent_value_id),
      sort_order:
        typeof rawValue.sort_order === "number"
          ? rawValue.sort_order
          : fallbackSortOrder,
      is_active:
        rawValue.is_active === undefined ? true : Boolean(rawValue.is_active),
    },
  };
};

const normalizeProductSpecifications = (
  rawSpecifications: unknown,
): NormalizedProductSpecification[] => {
  if (!rawSpecifications) {
    return [];
  }

  if (Array.isArray(rawSpecifications)) {
    return rawSpecifications.flatMap((entry, index) => {
      const normalized = normalizeProductSpecificationEntry(
        entry,
        undefined,
        index,
      );
      return normalized ? [normalized] : [];
    });
  }

  if (typeof rawSpecifications !== "object") {
    return [];
  }

  return Object.entries(rawSpecifications as Record<string, unknown>).flatMap(
    ([specificationKey, specificationEntry], index) => {
      const fallbackSpecificationId = Number(specificationKey);
      const normalizedFallbackSpecificationId = Number.isNaN(
        fallbackSpecificationId,
      )
        ? undefined
        : fallbackSpecificationId;

      if (Array.isArray(specificationEntry)) {
        return specificationEntry.flatMap((entry, itemIndex) => {
          const normalized = normalizeProductSpecificationEntry(
            entry,
            normalizedFallbackSpecificationId,
            itemIndex,
          );
          return normalized ? [normalized] : [];
        });
      }

      const directEntry = normalizeProductSpecificationEntry(
        specificationEntry,
        normalizedFallbackSpecificationId,
        index,
      );
      if (directEntry) {
        return [directEntry];
      }

      if (!specificationEntry || typeof specificationEntry !== "object") {
        return [];
      }

      const rawValues = (specificationEntry as Record<string, unknown>).values;
      if (!rawValues || typeof rawValues !== "object") {
        return [];
      }

      return Object.entries(rawValues as Record<string, unknown>).flatMap(
        ([valueKey, entry], itemIndex) => {
          const normalizedEntry =
            entry && typeof entry === "object"
              ? { ...(entry as Record<string, unknown>), id: Number(valueKey) }
              : entry;

          const normalized = normalizeProductSpecificationEntry(
            normalizedEntry,
            normalizedFallbackSpecificationId,
            itemIndex,
          );
          return normalized ? [normalized] : [];
        },
      );
    },
  );
};

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const product_id = Number(params?.id);
  const isValidProductId = Number.isFinite(product_id);

  if (!isValidProductId) {
    return null;
  }

  const {
    data: productData,
    isLoading: productLoading,
    isError: productError,
    error: productErrorData,
    refetch: refetchProduct,
  } = useProduct(product_id, { enabled: isValidProductId });
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories();
  const { data: vendorsData, isLoading: vendorsLoading } = useVendors();
  const { data: brandsData, isLoading: brandsLoading } = useBrands();
  const { data: attributesData, isLoading: attributesLoading } =
    useAttributes();
  const { data: specificationsData, isLoading: specificationsLoading } =
    useSpecifications();

  // Transform backend data to frontend format
  const categories = categoriesData || [];

  const vendors =
    vendorsData?.data?.map((vendor) => ({
      id: vendor.id.toString(),
      name: vendor.name_en,
      nameEn: vendor.name_en,
      nameAr: vendor.name_ar,
    })) || [];

  const brands =
    brandsData?.data?.map((brand) => ({
      id: brand.id.toString(),
      name: brand.name_en,
      nameEn: brand.name_en,
      nameAr: brand.name_ar,
    })) || [];

  const attributes =
    attributesData?.map((attr: Attribute) => ({
      id: attr.id.toString(),
      parentId: attr.parent_id?.toString(), // Added parentId
      parentValueId: attr.parent_value_id?.toString(), // Added parentValueId for attribute linking
      name: attr.name_en,
      displayName: attr.name_ar,
      values:
        attr.values?.map((val: AttributeValue) => {
          const pId =
            val.parent_value_id !== null && val.parent_value_id !== undefined
              ? val.parent_value_id.toString()
              : undefined;
          // console.log(`[EditProduct] Value: ${val.value_en} (ID: ${val.id}) -> Parent: ${pId}`);
          return {
            id: val.id.toString(),
            parentId: pId,
            value: val.value_en,
            displayValue: val.value_ar,
          };
        }) || [],
    })) || [];

  const specifications =
    specificationsData?.map((specification: Specification) => ({
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

  // Transform product data to form initial data
  const product: ProductDetail | undefined = productData?.data as
    | ProductDetail
    | undefined;
  const normalizedProductSpecifications = React.useMemo(
    () => normalizeProductSpecifications(product?.specifications),
    [product?.specifications],
  );

  // Helper function to build attributeValues map from variant combinations
  const buildAttributeValuesMap = (
    combinations: any[],
  ): { [attrId: string]: string } => {
    const map: { [attrId: string]: string } = {};
    combinations?.forEach((combo: any) => {
      const attrId = (
        combo.attribute_id || combo.attribute_value?.attribute_id
      )?.toString();
      const valueId = (combo.value_id || combo.attribute_value_id)?.toString();
      if (attrId && valueId) {
        map[attrId] = valueId;
      }
    });
    return map;
  };

  // Helper function to build attributeValues map from groupValues or combination
  const buildAttributeValuesFromItem = (
    item: any,
  ): { [attrId: string]: string } => {
    const map: { [attrId: string]: string } = {};

    // First try groupValues format (array of { attribute_id, attribute_value_id })
    if (item?.groupValues && Array.isArray(item.groupValues)) {
      item.groupValues.forEach((gv: any) => {
        const attrId = gv.attribute_id?.toString();
        const valueId = gv.attribute_value_id?.toString();
        if (attrId && valueId) {
          map[attrId] = valueId;
        }
      });
      return map;
    }

    // Fallback to combination format (object { "attr_id": value_id })
    if (item?.combination && typeof item.combination === "object") {
      for (const [attrId, valueId] of Object.entries(item.combination)) {
        if (attrId && valueId !== undefined && valueId !== null) {
          map[attrId] = valueId.toString();
        }
      }
    }

    return map;
  };

  // Legacy function for backward compatibility - delegates to buildAttributeValuesFromItem
  const buildAttributeValuesFromGroupValues = (
    groupValues: any[],
  ): { [attrId: string]: string } => {
    return buildAttributeValuesFromItem({ groupValues });
  };

  // Helper function to generate variant key from attributeValues
  const generateVariantKey = (attributeValues: {
    [attrId: string]: string;
  }): string => {
    return Object.values(attributeValues).sort().join("-");
  };

  const transformProductSpecifications = () => {
    if (
      product?.specifications &&
      !Array.isArray(product.specifications) &&
      Object.keys(product.specifications).length > 0
    ) {
      const backendSpecifications = Object.entries(
        product.specifications as Record<string, ProductSpecificationMap>,
      ).map(([specificationId, specificationData], index) => ({
        id: specificationId,
        name: specificationData.name_en,
        values: specificationData.values
          ? Object.entries(specificationData.values).map(
              ([valueId, valueData], valueIndex) => ({
                id: valueId,
                label: valueData.name_en,
                order: valueIndex,
              }),
            )
          : [],
        order: index,
      }));

      const getAllDescendantSpecificationIds = (parentId: string): string[] => {
        const children =
          specificationsData?.filter(
            (specification: Specification) =>
              String(specification.parent_id) === String(parentId),
          ) || [];
        const childIds = children.map((specification: Specification) =>
          String(specification.id),
        );
        return [
          ...childIds,
          ...childIds.flatMap((childId: string) =>
            getAllDescendantSpecificationIds(childId),
          ),
        ];
      };

      const buildSpecificationValuePath = (
        valueId: string,
        fallbackLabel: string,
      ) => {
        let currentId = valueId;
        const pathParts: string[] = [];
        let depth = 0;

        while (currentId && depth < 10) {
          let found = false;

          for (const specification of specificationsData || []) {
            const value = specification.values?.find(
              (specificationValue: SpecificationValue) =>
                String(specificationValue.id) === String(currentId),
            );

            if (value) {
              pathParts.unshift(value.value_en);
              currentId = value.parent_value_id
                ? String(value.parent_value_id)
                : "";
              found = true;
              break;
            }
          }

          if (!found) {
            break;
          }

          depth += 1;
        }

        return pathParts.length > 0 ? pathParts.join(" > ") : fallbackLabel;
      };

      const rootSpecifications = backendSpecifications.filter(
        (specification) => {
          const systemSpecification = specificationsData?.find(
            (item: Specification) =>
              String(item.id) === String(specification.id),
          );
          return !systemSpecification?.parent_id;
        },
      );

      return rootSpecifications
        .map((rootSpecification) => {
          const descendantIds = getAllDescendantSpecificationIds(
            rootSpecification.id,
          );
          const relatedSpecificationIds = [
            rootSpecification.id,
            ...descendantIds,
          ];
          const familySpecifications = backendSpecifications.filter(
            (specification) =>
              relatedSpecificationIds.includes(specification.id),
          );

          const allSelectedValues = familySpecifications.flatMap(
            (specification) => specification.values,
          );
          const selectedValueIds = new Set(
            allSelectedValues.map((value) => String(value.id)),
          );
          const parentValueIds = new Set<string>();

          specificationsData?.forEach((specification: Specification) => {
            specification.values?.forEach((value: SpecificationValue) => {
              if (
                value.parent_value_id &&
                selectedValueIds.has(String(value.id))
              ) {
                parentValueIds.add(String(value.parent_value_id));
              }
            });
          });

          const leafValues = allSelectedValues.filter(
            (value) => !parentValueIds.has(String(value.id)),
          );

          return {
            id: rootSpecification.id,
            name: rootSpecification.name,
            order: rootSpecification.order,
            values: leafValues.map((value, index) => ({
              id: value.id,
              label: buildSpecificationValuePath(value.id, value.label),
              order: index,
            })),
          };
        })
        .filter((specification) => specification.values.length > 0);
    }

    if (normalizedProductSpecifications.length === 0) {
      return undefined;
    }

    const getSpecificationById = (id: number | string) => {
      return specificationsData?.find(
        (specification: Specification) =>
          String(specification.id) === String(id),
      );
    };

    const getRootSpecification = (specificationId: number) => {
      let currentSpecification = getSpecificationById(specificationId);

      while (currentSpecification?.parent_id) {
        currentSpecification = getSpecificationById(
          currentSpecification.parent_id,
        );
      }

      return currentSpecification;
    };

    const groupedSelections = new Map<
      string,
      {
        id: string;
        name: string;
        values: Array<{ id: string; label: string; order: number }>;
        order: number;
      }
    >();

    normalizedProductSpecifications.forEach((productSpecification) => {
      const selectedValue = productSpecification.specification_value;
      if (!selectedValue) {
        return;
      }

      const directSpecification = getSpecificationById(
        selectedValue.specification_id,
      );
      const rootSpecification = directSpecification
        ? getRootSpecification(directSpecification.id) || directSpecification
        : undefined;
      if (!rootSpecification) {
        return;
      }

      const rootSpecificationId = rootSpecification.id.toString();
      if (!groupedSelections.has(rootSpecificationId)) {
        groupedSelections.set(rootSpecificationId, {
          id: rootSpecificationId,
          name: rootSpecification.name_en,
          values: [],
          order: groupedSelections.size,
        });
      }

      const selection = groupedSelections.get(rootSpecificationId);
      if (!selection) {
        return;
      }

      const selectedValueId = selectedValue.id.toString();
      if (!selection.values.some((value) => value.id === selectedValueId)) {
        selection.values.push({
          id: selectedValueId,
          label: selectedValue.value_en,
          order: selection.values.length,
        });
      }
    });

    return Array.from(groupedSelections.values());
  };

  // Transform attributes from product data
  const transformProductAttributes = () => {
    // Handle new dictionary format (Record<string, ProductAttribute>)
    if (
      product?.attributes &&
      !Array.isArray(product.attributes) &&
      Object.keys(product.attributes).length > 0
    ) {
      // 1. Convert current backend attributes to a list
      const backendAttributes = Object.entries(product.attributes).map(
        ([attrId, attrData]: [string, any], index) => {
          const values = attrData.values
            ? Object.entries(attrData.values).map(
                ([valId, valData]: [string, any], vIdx) => ({
                  id: valId,
                  value: valData.name_en || valData.value_en,
                  displayValue: valData.name_ar || valData.value_ar,
                  order: vIdx,
                }),
              )
            : [];

          return {
            id: attrId,
            name: attrData.name_en,
            values,
            order: index,
          };
        },
      );

      // 2. Filter to only show Root Attributes in the form
      // We look at 'attributesData' (system definitions) to know the hierarchy
      const rootAttributes = backendAttributes.filter((attr) => {
        const systemAttr = attributesData?.find(
          (a: Attribute) => String(a.id) === String(attr.id),
        );
        // It's a root if it has no parent_id
        return !systemAttr?.parent_id;
      });

      // 3. For each Root attribute, we need to collect values from itself + its descendants
      return rootAttributes.map((rootAttr) => {
        // Find all values selected for this root (and its children) basically "flattening" the selection
        // The UI expects the root attribute to have values that are "Leaf" values (or path values)

        // But wait, the AttributesSection component does hierarchical lookup based on availableAttributes.
        // It basically says: "If you select N4500 (Level 2), we know it belongs to Celeron -> Intel".
        // So if we just populate the ROOT attribute with the *Leaf* value IDs,
        // attributes section *should* be able to display it if it knows the path.

        // However, the input to ProductForm `attributes` prop is `Attribute[]` with `values: AttributeValue[]`.
        // If we only include the Root Attribute, its `values` array must contain the SELECTED values.
        // IF the selected value is from Level 2 (e.g. N4500), we must put N4500 in the `values` array of the Root Attribute (CPU).

        // Let's find all descendant attributes of this root
        const getAllDescendantIds = (parentId: string): string[] => {
          const children =
            attributesData?.filter(
              (a: Attribute) => String(a.parent_id) === String(parentId),
            ) || [];
          const childIds = children.map((c: Attribute) => String(c.id));
          return [
            ...childIds,
            ...childIds.flatMap((cid: string) => getAllDescendantIds(cid)),
          ];
        };

        const descendantIds = getAllDescendantIds(rootAttr.id);
        const relatedAttrIds = [rootAttr.id, ...descendantIds];

        // Find backend attributes that are part of this family
        const familyAttributes = backendAttributes.filter((ba) =>
          relatedAttrIds.includes(ba.id),
        );

        // Collect all selected values from this family
        const allSelectedValues: any[] = [];
        familyAttributes.forEach((fa) => {
          allSelectedValues.push(...fa.values);
        });

        // Now determine which values to actually put in the form state for this Root Attribute.
        // The standard behavior for a hierarchical select is that the "Leaf" selection implies the parents.
        // So we should look for values that are "Leaves" in the context of the current selection.

        // Or simpler: Just identifying which values are at the "deepest" level for each chain.
        // If we have Intel, Celeron, N4500 selected. N4500 is the deepest.
        // We put N4500 in the values list. The UI component `AttributesSection` uses `findDescendants` on `availableAttributes`.
        // `findDescendants` generates options. If we pass N4500 ID as a selected value,
        // `AttributesSection` needs to match it against an option.

        // In `AttributesSection.tsx`:
        // `options` are generated from `availableAttr.values` (roots) -> recursively finding children.
        // The `originalId` of the generated option is the LEAF ID.
        // So if we put the LEAF ID (N4500, ID 40) into the `values` array of the Root Attribute (CPU), it should match.

        // Optimization: Filter `allSelectedValues` to keep only those that are NOT parents of another selected value.
        // But actually, just dumping all selected values *might* confuse the UI if it tries to render "Intel" AND "Intel > Celeron > N4500".
        // We only want the leaf.

        // To find leaves among selected values:
        // A value is a leaf if no other selected value has it as a parent.
        // But `valData` here doesn't have parent info easily accessible without looking up `attributesData`.

        // Let's build a set of all selected parent_value_ids
        const selectedValueIds = new Set(
          allSelectedValues.map((v) => String(v.id)),
        );
        const parentValueIds = new Set<string>();

        allSelectedValues.forEach((val) => {
          // Find this value in system attributes to check its children?
          // Or check if any *other* selected value points to this as parent.
          // We need to look up system definition of the values.
          // This can be expensive O(N^2).
          // Better: Iterate all system values. If a system value has `parent_value_id` X, and that system value is in `selectedValueIds`, then X is a parent.
          // We need to find X in `selectedValueIds`.
        });

        // Let's use `attributesData` (system definitions)
        attributesData?.forEach((sysAttr: Attribute) => {
          sysAttr.values?.forEach((sysVal: AttributeValue) => {
            if (
              sysVal.parent_value_id &&
              selectedValueIds.has(String(sysVal.id))
            ) {
              // The current value is selected, so its parent is a "Parent" -> mark parent as such
              parentValueIds.add(String(sysVal.parent_value_id));
            }
          });
        });

        // Filter out parents
        const leafValues = allSelectedValues.filter(
          (v) => !parentValueIds.has(String(v.id)),
        );
        const primaryLeafValues = leafValues.slice(0, 1);

        // The UI expects `values` in the form object.
        // We map these leaf values to the structure required.
        // Note: displayValue might need to be the full path?
        // `AttributesSection` uses `v.value` to match with `option.value`.
        // `option.value` is the full path string.
        // `AttributesSection` uses `selectedValues = attribute.values.map(v => v.value)`.
        // So we need to reconstruct the full path string for `value`.

        const enrichedValues = primaryLeafValues.map((lv) => {
          // Reconstruct path
          // We have the leaf ID. We can traverse up `attributesData` to build the string.
          let currentId = String(lv.id);
          let pathParts: string[] = [];

          // Infinite loop protection
          let depth = 0;
          while (currentId && depth < 10) {
            // Find value in system
            let found = false;
            for (const a of attributesData || []) {
              const v = a.values?.find(
                (val: AttributeValue) => String(val.id) === currentId,
              );
              if (v) {
                pathParts.unshift(v.value_en);
                currentId = v.parent_value_id ? String(v.parent_value_id) : "";
                found = true;
                break;
              }
            }
            if (!found) break;
            depth++;
          }

          return {
            ...lv,
            value: pathParts.join(" > "), // Matches the " > " separator in AttributesSection
          };
        });

        return {
          ...rootAttr,
          values: enrichedValues, // This attribute now contains only leaf values with full path names
        };
      });
    }

    if (
      !product?.attributes ||
      (Array.isArray(product.attributes) && product.attributes.length === 0)
    )
      return undefined;

    // ... Legacy array handling omitted (assuming newer format is primary) ...
    // Just keeping the fallback logic as is but note user specifically shared dictionary structure

    // Get unique attribute values used across all variants
    const attributeValuesUsed: { [attrId: string]: Set<string> } = {};

    product.variants?.forEach((variant: any) => {
      // Handle legacy combination format
      if (variant.combinations) {
        variant.combinations.forEach((combo: any) => {
          const attrId = (
            combo.attribute_id || combo.attribute_value?.attribute_id
          )?.toString();
          const valueId = (
            combo.value_id || combo.attribute_value_id
          )?.toString();
          if (attrId && valueId) {
            if (!attributeValuesUsed[attrId]) {
              attributeValuesUsed[attrId] = new Set();
            }
            attributeValuesUsed[attrId].add(valueId);
          }
        });
      }

      // Handle new attribute_values dictionary format
      if (variant.attribute_values) {
        Object.entries(variant.attribute_values).forEach(([attrId, valId]) => {
          if (attrId && valId) {
            if (!attributeValuesUsed[attrId]) {
              attributeValuesUsed[attrId] = new Set();
            }
            attributeValuesUsed[attrId].add(valId.toString());
          }
        });
      }
    });

    return (product.attributes as any[]).map((attr: any, index: number) => {
      const attrId =
        attr.attribute_id?.toString() || attr.attribute?.id?.toString();
      const attrName = attr.attribute?.name_en || "";

      // Get the values used for this attribute from variants
      const usedValueIds = attributeValuesUsed[attrId] || new Set();

      // Find all values from availableAttributes that match the used IDs
      const availableAttr = attributesData?.find(
        (a: Attribute) => a.id.toString() === attrId,
      );
      const values =
        availableAttr?.values
          ?.filter((v: AttributeValue) => usedValueIds.has(v.id.toString()))
          .map((v: AttributeValue, idx: number) => ({
            id: v.id.toString(),
            value: v.value_en,
            order: idx,
          }))
          .slice(0, 1) || [];

      return {
        id: attrId,
        name: attrName,
        values,
        order: index,
      };
    });
  };

  // Transform variant pricing from prices array
  const transformVariantPricing = (stockVariants: any[], attrs: any[]) => {
    const hasAttributes = attrs && attrs.length > 0;
    if (!hasAttributes) return undefined;
    const variantAttributeIds = attrs.map((a: any) => String(a.id));

    if (product?.price_groups && product?.variants) {
      const uniqueMap = new Map();

      product.variants.forEach((variant: any) => {
        const pgId = variant.price_group_id?.toString();
        if (!pgId || !product.price_groups![pgId]) return;

        const pg = product.price_groups![pgId];
        const stockVariant = stockVariants.find(
          (sv: any) => sv.id === variant.id.toString(),
        );

        const attributeValues: any = {};
        if (stockVariant) {
          variantAttributeIds.forEach((id) => {
            if (stockVariant.attributeValues[id] !== undefined) {
              attributeValues[id] = stockVariant.attributeValues[id];
            }
          });
        }

        const key = generateVariantKey(attributeValues);
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            key,
            attributeValues,
            cost:
              pg.cost !== null && pg.cost !== undefined
                ? parseFloat(pg.cost)
                : 0,
            price: parseFloat(pg.price),
            isSale: !!pg.sale_price,
            salePrice: pg.sale_price ? parseFloat(pg.sale_price) : undefined,
          });
        }
      });
      return Array.from(uniqueMap.values());
    }

    // Use prices array with groupValues or combination for variant pricing
    const prices = (product as any).prices;
    if (prices && prices.length > 0) {
      const uniqueMap = new Map();
      prices.forEach((pg: any) => {
        let attributeValues = buildAttributeValuesFromItem(pg);
        const filteredAttrValues: any = {};
        variantAttributeIds.forEach((id) => {
          if (attributeValues[id] !== undefined)
            filteredAttrValues[id] = attributeValues[id];
        });
        const key = generateVariantKey(filteredAttrValues);
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            key,
            attributeValues: filteredAttrValues,
            cost: pg.cost ? parseFloat(pg.cost) : 0,
            price: pg.price ? parseFloat(pg.price) : 0,
            isSale: !!pg.sale_price,
            salePrice: pg.sale_price ? parseFloat(pg.sale_price) : undefined,
          });
        }
      });
      return Array.from(uniqueMap.values());
    }

    return undefined;
  };

  // Transform variant weight/dimensions from weights array
  const transformVariantWeightDimensions = (
    stockVariants: any[],
    attrs: any[],
  ) => {
    if (!attrs) return undefined;
    const variantAttributeIds = attrs.map((a: any) => String(a.id));
    if (variantAttributeIds.length === 0) return undefined;

    // NEW: Handle weights via variants linking to weight_groups
    if (product?.weight_groups && product?.variants) {
      const uniqueMap = new Map();

      product.variants.forEach((variant: any) => {
        const wgId = variant.weight_group_id?.toString();
        if (!wgId || !product.weight_groups![wgId]) return;

        const wg = product.weight_groups![wgId];

        const stockVariant = stockVariants.find(
          (sv: any) => sv.id === variant.id.toString(),
        );
        const attributeValues: any = {};
        if (stockVariant) {
          variantAttributeIds.forEach((id) => {
            if (stockVariant.attributeValues[id] !== undefined) {
              attributeValues[id] = stockVariant.attributeValues[id];
            }
          });
        }
        const key = generateVariantKey(attributeValues);

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            key,
            attributeValues,
            weight: wg.weight ? parseFloat(wg.weight) : undefined,
            length: wg.dimensions?.length
              ? parseFloat(wg.dimensions.length)
              : undefined,
            width: wg.dimensions?.width
              ? parseFloat(wg.dimensions.width)
              : undefined,
            height: wg.dimensions?.height
              ? parseFloat(wg.dimensions.height)
              : undefined,
          });
        }
      });
      return Array.from(uniqueMap.values());
    }

    // Use weights array with groupValues or combination for variant weights
    const weights = (product as any).weights;
    if (!weights || weights.length === 0) return undefined;

    const uniqueMap = new Map();
    weights.forEach((wg: any) => {
      let attributeValues = buildAttributeValuesFromItem(wg);
      const filteredAttrValues: any = {};
      variantAttributeIds.forEach((id) => {
        if (attributeValues[id] !== undefined)
          filteredAttrValues[id] = attributeValues[id];
      });
      const key = generateVariantKey(filteredAttrValues);

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          key,
          attributeValues: filteredAttrValues,
          weight: wg.weight ? parseFloat(wg.weight) : undefined,
          length: wg.length ? parseFloat(wg.length) : undefined,
          width: wg.width ? parseFloat(wg.width) : undefined,
          height: wg.height ? parseFloat(wg.height) : undefined,
        });
      }
    });
    return Array.from(uniqueMap.values());
  };

  // Transform variants (stock) from product data
  const transformVariants = () => {
    // For variant products with variants array
    if (product?.variants && product.variants.length > 0) {
      // We need to identify Root Attributes again to map child values back to roots
      // Copy logic from transformProductAttributes ideally, but for now we do a simple lookup
      // Iterate over system attributes to find hierarchies.
      const childToRootMap = new Map<string, string>(); // ChildAttrId -> RootAttrId

      const getRootId = (attrId: string): string => {
        if (childToRootMap.has(attrId)) return childToRootMap.get(attrId)!;

        const sysAttr = attributesData?.find(
          (a: any) => String(a.id) === String(attrId),
        );
        if (!sysAttr) return attrId; // Not found, return self

        if (!sysAttr.parent_id) {
          childToRootMap.set(attrId, attrId);
          return attrId;
        }

        // Recurse up
        const root = getRootId(String(sysAttr.parent_id));
        childToRootMap.set(attrId, root);
        return root;
      };

      return product.variants.map((variant: any) => {
        const stock = product.stock?.find(
          (s: any) => s.variant_id === variant.id,
        );

        let attributeValues: { [key: string]: string } = {};

        if (variant.combinations) {
          attributeValues = buildAttributeValuesMap(variant.combinations);
        } else if (variant.attribute_values) {
          Object.entries(variant.attribute_values).forEach(([k, v]) => {
            if (v !== null && v !== undefined) {
              attributeValues[k] = v.toString();
            }
          });
        }

        // COLLAPSE HIERARCHIES
        // If we have keys for child attributes, we must map their values to the Root Attribute Key.
        // And we must ensure we pick the "deepest" value (Leaf) for that Root Key.

        const collapsedAttributeValues: { [key: string]: string } = {};

        // 1. Group values by Root Attribute ID
        const valuesByRoot: { [rootId: string]: string[] } = {};

        Object.entries(attributeValues).forEach(([attrId, valId]) => {
          const rootId = getRootId(attrId);
          if (!valuesByRoot[rootId]) valuesByRoot[rootId] = [];
          valuesByRoot[rootId].push(valId);
        });

        // 2. For each Root, find the Leaf Value among the values associated with it
        // A value is a leaf if it is not a parent of any other value in the group.

        Object.entries(valuesByRoot).forEach(([rootId, valIds]) => {
          // Find leaf
          let leafValId = valIds[0];

          // If multiple values, we need to check hierarchy between them.
          if (valIds.length > 1) {
            // Check if valA is parent of valB
            const isParent = (parentId: string, childId: string): boolean => {
              // Check if childId definition has parent_value_id == parentId
              // Need to find definition of childId
              // We need to iterate over attributesData... might be slow.
              // Optimization: Build global value map?
              // For now, iterate.
              for (const a of attributesData || []) {
                const v = a.values.find(
                  (val: any) => String(val.id) === String(childId),
                );
                if (v) {
                  if (String(v.parent_value_id) === String(parentId))
                    return true;
                  // Recurse? No, strict parent.
                  // Wait, is it direct parent? Yes usually.
                }
              }
              return false;
            };

            // Simple approach: Iterate all, eliminate any that IS a parent of another
            const parents = new Set<string>();
            valIds.forEach((possibleParent) => {
              // Check if this is a parent of any OTHER value in the list
              valIds.forEach((possibleChild) => {
                if (
                  possibleParent !== possibleChild &&
                  isParent(possibleParent, possibleChild)
                ) {
                  parents.add(possibleParent);
                }
              });
            });

            const leaves = valIds.filter((v) => !parents.has(v));
            if (leaves.length > 0) leafValId = leaves[0];
          }

          collapsedAttributeValues[rootId] = leafValId;
        });

        return {
          id: variant.id.toString(),
          attributeValues: collapsedAttributeValues,
          is_out_of_stock:
            typeof variant.is_out_of_stock === "boolean"
              ? variant.is_out_of_stock
              : false,
          active: variant.is_active ?? true,
        };
      });
    }

    // For single products, get stock from stock array where variant_id is null
    if (product?.stock && product.stock.length > 0) {
      const singleStock = product.stock.find((s: any) => s.variant_id === null);
      if (singleStock) {
        return [
          {
            id: "single",
            attributeValues: {},
            is_out_of_stock: singleStock.is_out_of_stock ?? false,
          },
        ];
      }
    }

    // New API structure: `quantity` is the total stock for a simple product
    if ((product as any)?.quantity !== undefined) {
      return [
        {
          id: "single",
          attributeValues: {},
          is_out_of_stock: (product as any).is_out_of_stock ?? false,
        },
      ];
    }

    // Fallback: variants array is empty but attributes dict exists with values.
    // Generate one combination per Cartesian product of attribute values.
    const attrDict = (product as any)?.attributes;
    if (
      attrDict &&
      !Array.isArray(attrDict) &&
      Object.keys(attrDict).length > 0
    ) {
      // Build list of [attrId, valueId[]] entries
      const attrEntries: [string, string[]][] = (
        Object.entries(attrDict) as [string, any][]
      )
        .map(([attrId, attrData]) => {
          const valueIds: string[] = attrData.values
            ? Object.keys(attrData.values)
            : [];
          return [attrId, valueIds] as [string, string[]];
        })
        .filter(([, vals]) => vals.length > 0);

      if (attrEntries.length > 0) {
        // Cartesian product
        const combos: Record<string, string>[] = attrEntries.reduce<
          Record<string, string>[]
        >((acc, [attrId, valueIds]) => {
          if (acc.length === 0) return valueIds.map((v) => ({ [attrId]: v }));
          return acc.flatMap((combo) =>
            valueIds.map((v) => ({ ...combo, [attrId]: v })),
          );
        }, []);
        return combos.map((combo, i) => ({
          id: `variant-init-${i}`,
          attributeValues: combo,
          is_out_of_stock: false,
          active: true,
        }));
      }
    }

    return undefined;
  };

  // Check if weight is variant-based (has weights with groupValues)
  const isWeightVariantBased = () => {
    // Check if weights exist with non-empty groupValues (variant-based)
    const weights = (product as any)?.weights;
    if (weights && weights.length > 0) {
      // If any weight has groupValues, it's variant-based
      if (weights.some((w: any) => w.groupValues && w.groupValues.length > 0))
        return true;
    }

    // New structure: Only if more than one group exists, it implies variance
    if (
      (product as any)?.weight_groups &&
      Object.keys((product as any)?.weight_groups).length > 1
    )
      return true;

    return false;
  };

  // Check if media is variant-based (has media_group with groupValues)
  const isMediaVariantBased = () => {
    // Check if any media has media_group with non-empty groupValues (variant-based)
    const media = product?.media;
    if (media && media.length > 0) {
      if (
        media.some(
          (m: any) =>
            m.media_group?.groupValues && m.media_group.groupValues.length > 0,
        )
      )
        return true;
    }

    // New structure: Only if more than one group exists, it implies variance
    if (
      (product as any)?.media_groups &&
      Object.keys((product as any)?.media_groups).length > 1
    )
      return true;

    return false;
  };

  // Transform single media (non-variant) - for products without variant-based media
  const transformSingleMedia = (): NonNullable<ProductFormData["media"]> => {
    const sortMediaWithPrimaryFirst = (
      media: NonNullable<ProductFormData["media"]>,
    ): NonNullable<ProductFormData["media"]> => {
      return [...media].sort((left, right) => {
        if (left.isPrimary === right.isPrimary) {
          return left.order - right.order;
        }

        return left.isPrimary ? -1 : 1;
      });
    };

    // New API Structure: If only one media group, use it
    if ((product as any)?.media_groups) {
      const groups: any[] = Object.values((product as any).media_groups);
      if (groups.length > 0) {
        const mGroup = groups[0];
        if (mGroup.media && Array.isArray(mGroup.media)) {
          return sortMediaWithPrimaryFirst(
            mGroup.media.map((m: any) => ({
              id: m.id.toString(),
              file: null,
              preview: m.url,
              type: m.type as "image" | "video",
              order: m.sort_order || 0,
              isPrimary: m.is_primary,
            })),
          );
        }
      }
    }

    if (!product?.media || product.media.length === 0) return [];

    // Return all media sorted by sort_order
    return sortMediaWithPrimaryFirst(
      product.media.map((m: any) => ({
        id: m.id.toString(),
        file: null,
        preview: m.url,
        type: m.type as "image" | "video",
        order: m.sort_order,
        isPrimary: m.is_primary,
      })),
    );
  };

  const transformAttachments = (): NonNullable<ProductFormData["attachments"]> => {
    const attachments = (product as any)?.attachments;
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return [];
    }

    return [...attachments]
      .sort((left: any, right: any) => {
        const leftOrder = left.sort_order ?? 0;
        const rightOrder = right.sort_order ?? 0;
        return leftOrder - rightOrder;
      })
      .map((attachment: any, index: number) => ({
        id: attachment.id.toString(),
        file: null,
        name: attachment.original_name || `File ${index + 1}`,
        size: attachment.size ? Number(attachment.size) : undefined,
        url: attachment.url,
        order: attachment.sort_order ?? index,
      }));
  };

  // Transform variant media from media array with media_group
  const transformVariantMedia = (stockVariants: any[], attrs: any[]) => {
    if (!attrs) return undefined;
    const variantAttributeIds = attrs.map((a: any) => String(a.id));
    if (variantAttributeIds.length === 0) return undefined;

    // NEW: Handle media via variants linking to media_groups
    if (product?.media_groups && product?.variants) {
      const mediaGroupItems = new Map();

      Object.entries(product.media_groups).forEach(
        ([groupId, group]: [string, any]) => {
          if (group.media && Array.isArray(group.media)) {
            mediaGroupItems.set(
              groupId,
              group.media
                .map((m: any) => ({
                  id: m.id.toString(),
                  file: null,
                  preview: m.url,
                  type: m.type as "image" | "video",
                  order: m.sort_order || 0,
                  isPrimary: m.is_primary,
                }))
                .sort((a: any, b: any) => a.order - b.order),
            );
          }
        },
      );

      const uniqueMap = new Map();

      product.variants.forEach((variant: any) => {
        const mgId = variant.media_group_id?.toString();
        if (!mgId || !mediaGroupItems.has(mgId)) return;

        const stockVariant = stockVariants.find(
          (sv: any) => sv.id === variant.id.toString(),
        );
        const attributeValues: any = {};
        if (stockVariant) {
          variantAttributeIds.forEach((id) => {
            if (stockVariant.attributeValues[id] !== undefined) {
              attributeValues[id] = stockVariant.attributeValues[id];
            }
          });
        }
        const key = generateVariantKey(attributeValues);

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            key,
            attributeValues,
            media: mediaGroupItems.get(mgId),
          });
        }
      });
      return Array.from(uniqueMap.values());
    }

    if (!product?.media || product.media.length === 0) return undefined;

    // Group media by media_group.id
    const mediaGroupMap = new Map<
      number,
      { groupValues: any[]; mediaItems: any[] }
    >();

    product.media.forEach((m: any) => {
      if (!m.media_group) return;

      const groupId = m.media_group.id;
      if (!mediaGroupMap.has(groupId)) {
        mediaGroupMap.set(groupId, {
          groupValues: m.media_group.groupValues || [],
          mediaItems: [],
        });
      }

      mediaGroupMap.get(groupId)!.mediaItems.push({
        id: m.id.toString(),
        file: null,
        preview: m.url,
        type: m.type as "image" | "video",
        order: m.sort_order,
        isPrimary: m.is_primary,
      });
    });

    // Convert to array format
    const uniqueMap = new Map();
    Array.from(mediaGroupMap.values()).forEach((group) => {
      let attributeValues = buildAttributeValuesFromGroupValues(
        group.groupValues,
      );
      const filteredAttrValues: any = {};
      variantAttributeIds.forEach((id) => {
        if (attributeValues[id] !== undefined)
          filteredAttrValues[id] = attributeValues[id];
      });
      const key = generateVariantKey(filteredAttrValues);

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          key,
          attributeValues: filteredAttrValues,
          media: group.mediaItems.sort((a: any, b: any) => a.order - b.order),
        });
      }
    });
    return Array.from(uniqueMap.values());
  };

  const transformSingleWeight = () => {
    const topLevelWeight = parseOptionalNumber((product as any)?.weight);
    const topLevelLength = parseOptionalNumber((product as any)?.length);
    const topLevelWidth = parseOptionalNumber((product as any)?.width);
    const topLevelHeight = parseOptionalNumber((product as any)?.height);
    const topLevelWeightUnit: "g" | "kg" =
      (product as any)?.weight_unit === "g" ? "g" : "kg";
    const topLevelDimensionUnit = ["mm", "cm", "m"].includes(
      (product as any)?.dimension_unit,
    )
      ? ((product as any)?.dimension_unit as "mm" | "cm" | "m")
      : "cm";

    if (
      topLevelWeight !== undefined ||
      topLevelLength !== undefined ||
      topLevelWidth !== undefined ||
      topLevelHeight !== undefined
    ) {
      return {
        weight: topLevelWeight,
        length: topLevelLength,
        width: topLevelWidth,
        height: topLevelHeight,
        weightUnit: topLevelWeightUnit,
        dimensionUnit: topLevelDimensionUnit,
      };
    }

    // Check for weights array (single product would have one weight with empty groupValues)
    const weights = (product as any)?.weights;
    if (weights && weights.length > 0) {
      // For single products, use the first weight (should have empty groupValues)
      const singleWeight = weights[0];
      return {
        weight: singleWeight.weight
          ? parseFloat(singleWeight.weight)
          : undefined,
        length: singleWeight.length
          ? parseFloat(singleWeight.length)
          : undefined,
        width: singleWeight.width ? parseFloat(singleWeight.width) : undefined,
        height: singleWeight.height
          ? parseFloat(singleWeight.height)
          : undefined,
        weightUnit: topLevelWeightUnit,
        dimensionUnit: topLevelDimensionUnit,
      };
    }

    // New API structure: If only one weight group, use it as single weight
    if ((product as any)?.weight_groups) {
      const groups = Object.values((product as any).weight_groups);
      if (groups.length > 0) {
        const wg: any = groups[0];
        return {
          weight: wg.weight ? parseFloat(wg.weight) : undefined,
          length: wg.dimensions?.length
            ? parseFloat(wg.dimensions.length)
            : undefined,
          width: wg.dimensions?.width
            ? parseFloat(wg.dimensions.width)
            : undefined,
          height: wg.dimensions?.height
            ? parseFloat(wg.dimensions.height)
            : undefined,
          weightUnit: topLevelWeightUnit,
          dimensionUnit: topLevelDimensionUnit,
        };
      }
    }

    return undefined;
  };

  const transformSinglePricing = () => {
    const topLevelPrice = parseOptionalNumber((product as any)?.price);
    const topLevelCost = parseOptionalNumber((product as any)?.cost);
    const topLevelSalePrice = parseOptionalNumber((product as any)?.sale_price);
    const topLevelOriginalVendorPrice = parseOptionalNumber(
      (product as any)?.original_vendor_price,
    );
    const topLevelOriginalVendorSalePrice = parseOptionalNumber(
      (product as any)?.original_vendor_sale_price,
    );

    if (
      topLevelPrice !== undefined ||
      topLevelSalePrice !== undefined ||
      topLevelCost !== undefined
    ) {
      const resolvedPrice = topLevelPrice ?? topLevelSalePrice;

      if (resolvedPrice !== undefined) {
        return {
          cost: topLevelCost,
          originalVendorPrice: topLevelOriginalVendorPrice ?? resolvedPrice,
          originalVendorSalePrice:
            topLevelOriginalVendorSalePrice ?? topLevelSalePrice,
          price: resolvedPrice,
          isSale: topLevelSalePrice !== undefined,
          salePrice: topLevelSalePrice,
        };
      }
    }

    // New API structure: price_groups dict  { "88": { price, sale_price, cost } }
    if ((product as any)?.price_groups) {
      const groups = Object.values((product as any).price_groups);
      if (groups.length > 0) {
        const pg: any = groups[0];
        const groupPrice = pg.price ? parseFloat(pg.price) : undefined;
        const groupSalePrice = pg.sale_price
          ? parseFloat(pg.sale_price)
          : undefined;

        return {
          cost:
            pg.cost !== undefined && pg.cost !== null
              ? parseFloat(pg.cost)
              : undefined,
          originalVendorPrice: topLevelOriginalVendorPrice ?? groupPrice,
          originalVendorSalePrice:
            topLevelOriginalVendorSalePrice ?? groupSalePrice,
          price: groupPrice ?? 0,
          isSale: !!pg.sale_price,
          salePrice: groupSalePrice,
        };
      }
    }

    // Check for prices array (single product would have one price with empty groupValues)
    const prices = (product as any)?.prices;
    if (prices && prices.length > 0) {
      const pricing = prices[0];
      const arrayPrice = pricing.price ? parseFloat(pricing.price) : undefined;
      const arraySalePrice = pricing.sale_price
        ? parseFloat(pricing.sale_price)
        : undefined;

      return {
        cost:
          pricing.cost !== undefined && pricing.cost !== null
            ? parseFloat(pricing.cost)
            : undefined,
        originalVendorPrice: topLevelOriginalVendorPrice ?? arrayPrice,
        originalVendorSalePrice:
          topLevelOriginalVendorSalePrice ?? arraySalePrice,
        price: arrayPrice ?? 0,
        isSale: !!pricing.sale_price,
        salePrice: arraySalePrice,
      };
    }

    return undefined;
  };

  const initialData: Partial<ProductFormData> | undefined =
    React.useMemo(() => {
      if (!product) return undefined;

      // Determine if attributes exist
      const hasAttributes = Array.isArray(product.attributes)
        ? product.attributes.length > 0
        : product.attributes && Object.keys(product.attributes).length > 0;
      const attrs = hasAttributes ? transformProductAttributes() : undefined;
      const hasPricingAttributes = !!(attrs && attrs.length > 0);

      const stockVariants = transformVariants();

      return {
        // Basic Information
        slug: (product as any).slug,
        nameEn: product.name_en,
        nameAr: product.name_ar,
        sku: product.sku || "",
        record: (product as any).record || "",
        status: product.status || "active",
        quantity:
          product.quantity ??
          (product.stock && product.stock[0] ? product.stock[0].quantity : 0),
        is_out_of_stock:
          (product as any).is_out_of_stock ??
          (product.stock && product.stock[0]
            ? product.stock[0].is_out_of_stock
            : false),
        categoryIds:
          product.categories && product.categories.length > 0
            ? product.categories.map((c: any) => c.id.toString())
            : product.category_ids?.map((id) => id.toString()) ||
              (product.category?.id
                ? [product.category.id.toString()]
                : product.category_id
                  ? [product.category_id.toString()]
                  : []),
        vendorId:
          product.vendor?.id?.toString() || product.vendor_id?.toString(),
        brandId: product.brand?.id?.toString() || product.brand_id?.toString(),
        referenceLink: product.reference_link || "",
        linked_product_ids: Array.from(
          new Set(
            (
              product.linked_product_ids ||
              product.linked_products?.map(
                (linkedProduct) => linkedProduct.id,
              ) ||
              []
            )
              .map((linkedProductId) => String(linkedProductId))
              .filter(
                (linkedProductId) => linkedProductId !== String(product_id),
              ),
          ),
        ),
        shortDescriptionEn: product.short_description_en || "",
        shortDescriptionAr: product.short_description_ar || "",
        longDescriptionEn: product.long_description_en || "",
        longDescriptionAr: product.long_description_ar || "",
        visible: product.visible ?? product.is_active,
        metaTitleEn: (product as any).meta_title_en || "",
        metaTitleAr: (product as any).meta_title_ar || "",
        metaDescriptionEn: (product as any).meta_description_en || "",
        metaDescriptionAr: (product as any).meta_description_ar || "",
        tags: normalizeProductTags((product as any).tags),

        // Attributes
        attributes: attrs,
        specifications: transformProductSpecifications(),

        // Pricing
        pricing: transformSinglePricing(),

        // Weight & Dimensions
        weightDimensions: transformSingleWeight(),

        // Media
        media: transformSingleMedia(),

        // Downloads
        attachments: transformAttachments(),
      };
    }, [product, attributesData, specificationsData]);

  const handleSubmit = async (data: ProductFormData) => {
    const toastId = showLoadingToast("Updating product...");
    try {
      const { dto, mediaFiles } = transformFormDataToDto(data, {
        includeEmptyRelations: true,
        availableAttributes: attributes,
        availableSpecifications: specifications,
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
          title: "Updating product",
          subtitle: "Preparing request",
          progress: 0,
        });
      }
      const uploadedMedia: UploadedMediaReference[] = [];
      const uploadedAttachments: UploadedAttachmentReference[] = [];

      for (const media of productMedia) {
        if (media.file) {
          updateLoadingToast(toastId, {
            title: "Uploading media",
            subtitle: `${completedUploads + 1}/${totalUploads} files`,
            progress: totalUploads > 0 ? completedUploads / totalUploads : 0,
          });
          const uploadResult = await mediaService.uploadMedia(media.file!);
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

      const productPayload: UpdateProductDto = {
        ...dto,
        linked_product_ids: dto.linked_product_ids.filter(
          (linkedProductId) => linkedProductId !== product_id,
        ),
        media: productMedia.length > 0 ? buildMediaArray(uploadedMedia) : [],
        attachments: buildAttachmentsArray(uploadedAttachments),
      };

      updateLoadingToast(toastId, {
        title: "Updating product",
        subtitle: "Sending request",
        progress: 0.9,
      });
      await productService.updateProduct(product_id, productPayload);

      finishToastSuccess(toastId, "Product updated successfully");
      router.push("/products");
    } catch (error: any) {
      finishToastError(toastId, error?.message || "Failed to update product");
    }
  };

  const handleSaveDraft = async (data: Partial<ProductFormData>) => {
    try {
      // TODO: Implement draft saving functionality
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  };

  const isLoading =
    productLoading ||
    attributesLoading ||
    specificationsLoading ||
    categoriesLoading ||
    vendorsLoading ||
    brandsLoading;

  if (isLoading) {
    return (
      <div className="admin-state-page flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (productError) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-danger/10 p-3">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <h3 className="text-xl font-bold  mb-2">Error Loading Product</h3>
              <p className=" mb-6">
                {(productErrorData as any)?.message || "Failed to load product"}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => refetchProduct()}>Try Again</Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/products")}
                >
                  Back to Products
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!productLoading && !productError && !initialData) {
    return (
      <div className="admin-state-page">
        <div className="mx-auto">
          <Card>
            <div className="p-12 text-center">
              <h3 className="text-xl font-bold  mb-2">Product Not Found</h3>
              <p className=" mb-6">
                The product you're looking for doesn't exist.
              </p>
              <Button onClick={() => router.push("/products")}>
                Back to Products
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ProductForm
      productId={typeof params?.id === "string" ? params.id : undefined}
      isEditMode={true}
      initialData={initialData}
      initialLinkedProducts={(
        (product?.linked_products || []) as LinkedProductSummary[]
      ).filter(
        (linkedProduct) => String(linkedProduct.id) !== String(product_id),
      )}
      onSubmit={handleSubmit}
      onSaveDraft={handleSaveDraft}
      categories={categories}
      vendors={vendors}
      brands={brands}
      attributes={attributes}
      specifications={specifications}
    />
  );
}
