"use client";

import { AlertCircle, Percent, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Toggle } from "../../src/components/ui/toggle";
import { Button } from "../../src/components/ui/button";
import { Select } from "../../src/components/ui/select";
import { showErrorToast } from "../../src/lib/toast";
import {
  useBulkUpdateProductPricing,
  useCreateProductPriceRule,
  useDeleteProductPriceRule,
  useProductPriceRules,
  useUpdateProductPriceRule,
} from "../../src/services/settings/hooks/use-settings";
import {
  BulkUpdateProductPricingDto,
  CreateProductPriceRuleDto,
  ProductPriceRule,
} from "../../src/services/settings/types/settings.types";
import { useVendors } from "../../src/services/vendors/hooks/use-vendors";
import { useBrands } from "../../src/services/brands/hooks/use-brands";
import { CategoryTreeSelect } from "../../src/components/products/CategoryTreeSelect";
import { useResolvedFeatureToggles } from "../../src/hooks/use-resolved-feature-toggles";
import { useCategories } from "../../src/services/categories/hooks/use-categories";

import { useEffect, useState } from "react";

type ProductPriceRuleDraft = {
  id: number | null;
  vendor_ids: string[];
  brand_ids: string[];
  category_ids: string[];
  price_condition: "" | "any" | "more_than" | "less_than" | "between";
  adjustment_type: "" | "increase" | "decrease";
  min_product_price: string;
  max_product_price: string;
  percentage: string;
  is_active: boolean;
};

const createEmptyRuleDraft = (): ProductPriceRuleDraft => ({
  id: null,
  vendor_ids: [],
  brand_ids: [],
  category_ids: [],
  price_condition: "",
  adjustment_type: "",
  min_product_price: "",
  max_product_price: "",
  percentage: "1",
  is_active: true,
});

const mapRuleToDraft = (rule: ProductPriceRule): ProductPriceRuleDraft => {
  const legacyRule = rule as ProductPriceRule & {
    vendor_id?: number | null;
    brand_id?: number | null;
    min_vendor_price?: number | null;
    max_vendor_price?: number | null;
  };

  const vendorIds =
    rule.vendor_ids ??
    (legacyRule.vendor_id != null ? [legacyRule.vendor_id] : []);
  const brandIds =
    rule.brand_ids ?? (legacyRule.brand_id != null ? [legacyRule.brand_id] : []);
  const minProductPrice =
    rule.min_product_price ?? legacyRule.min_vendor_price ?? null;
  const maxProductPrice =
    rule.max_product_price ?? legacyRule.max_vendor_price ?? null;

  return {
    id: rule.id,
    vendor_ids: vendorIds.map((vendorId) => String(vendorId)),
    brand_ids: brandIds.map((brandId) => String(brandId)),
    category_ids: (rule.category_ids ?? []).map((categoryId) => String(categoryId)),
    price_condition: rule.price_condition ?? "between",
    adjustment_type: rule.adjustment_type ?? "decrease",
    min_product_price:
      minProductPrice === null || minProductPrice === undefined
        ? ""
        : String(minProductPrice),
    max_product_price:
      maxProductPrice === null || maxProductPrice === undefined
        ? ""
        : String(maxProductPrice),
    percentage: String(rule.percentage ?? "1"),
    is_active: rule.is_active ?? true,
  };
};

type BulkPricingFormState = {
  action: BulkUpdateProductPricingDto["action"];
  percentage: string;
  vendorIds: string[];
};

const defaultBulkPricingFormState: BulkPricingFormState = {
  action: "increase",
  percentage: "0",
  vendorIds: [],
};

export default function PricingSettingsPage() {
  const { isEnabled } = useResolvedFeatureToggles();
  const importAiProductsEnabled = isEnabled("import_ai_products_enabled");
  const {
    data: pricingRules,
    isLoading,
    isError,
    error,
    refetch,
  } = useProductPriceRules({ enabled: importAiProductsEnabled });
  const { data: vendorsData } = useVendors();
  const { data: brandsData } = useBrands({ page: 1, limit: 1000 });
  const { data: categoriesData } = useCategories();
  const createProductPriceRule = useCreateProductPriceRule();
  const updateProductPriceRule = useUpdateProductPriceRule();
  const deleteProductPriceRule = useDeleteProductPriceRule();
  const bulkUpdateProductPricing = useBulkUpdateProductPricing();
  const [ruleDrafts, setRuleDrafts] = useState<ProductPriceRuleDraft[]>([]);
  const [bulkPricingForm, setBulkPricingForm] = useState<BulkPricingFormState>(
    defaultBulkPricingFormState,
  );

  useEffect(() => {
    if (!pricingRules) {
      return;
    }

    setRuleDrafts(pricingRules.map(mapRuleToDraft));
  }, [pricingRules]);

  const setRuleField = <K extends keyof ProductPriceRuleDraft>(
    index: number,
    field: K,
    value: ProductPriceRuleDraft[K],
  ) => {
    setRuleDrafts((prev) =>
      prev.map((rule, currentIndex) =>
        currentIndex === index ? { ...rule, [field]: value } : rule,
      ),
    );
  };

  const buildRulePayload = (
    draft: ProductPriceRuleDraft,
  ): CreateProductPriceRuleDto | null => {
    const vendorIds = draft.vendor_ids.map((value) => Number(value));
    const brandIds = draft.brand_ids.map((value) => Number(value));
    const categoryIds = draft.category_ids.map((value) => Number(value));
    const minProductPrice =
      draft.min_product_price.trim() === ""
        ? null
        : Number(draft.min_product_price);
    const maxProductPrice =
      draft.max_product_price.trim() === ""
        ? null
        : Number(draft.max_product_price);
    const percentage = Number(draft.percentage);

    if (
      minProductPrice !== null &&
      (!Number.isFinite(minProductPrice) || minProductPrice < 0)
    ) {
      showErrorToast("Minimum product price must be 0 or more");
      return null;
    }

    if (
      maxProductPrice !== null &&
      (!Number.isFinite(maxProductPrice) || maxProductPrice < 0)
    ) {
      showErrorToast("Maximum product price must be 0 or more");
      return null;
    }

    if (
      minProductPrice !== null &&
      maxProductPrice !== null &&
      maxProductPrice < minProductPrice
    ) {
      showErrorToast(
        "Maximum product price must be greater than or equal to the minimum value",
      );
      return null;
    }

    if (!Number.isFinite(percentage) || percentage < 1) {
      showErrorToast("Percentage must be at least 1");
      return null;
    }

    if (!draft.adjustment_type) {
      showErrorToast("Select whether the rule increases or decreases prices");
      return null;
    }

    if (
      draft.price_condition === "less_than" &&
      maxProductPrice === null &&
      minProductPrice === null
    ) {
      showErrorToast("Less than condition needs a maximum product price");
      return null;
    }

    if (
      vendorIds.some((vendorId) => !Number.isInteger(vendorId) || vendorId < 1) ||
      brandIds.some((brandId) => !Number.isInteger(brandId) || brandId < 1) ||
      categoryIds.some((categoryId) => !Number.isInteger(categoryId) || categoryId < 1)
    ) {
      showErrorToast("Vendor, brand, and category selections are invalid");
      return null;
    }

    return {
      vendor_ids: vendorIds.length > 0 ? vendorIds : null,
      brand_ids: brandIds.length > 0 ? brandIds : null,
      category_ids: categoryIds.length > 0 ? categoryIds : null,
      // Empty condition means no price filter: between with empty bounds matches all.
      price_condition: draft.price_condition === "" ? "between" : draft.price_condition,
      adjustment_type: draft.adjustment_type,
      min_product_price: minProductPrice,
      max_product_price: maxProductPrice,
      percentage,
      is_active: draft.is_active,
    };
  };

  const handleSaveRule = async (index: number) => {
    const draft = ruleDrafts[index];
    if (!draft) {
      return;
    }

    const payload = buildRulePayload(draft);
    if (!payload) {
      return;
    }

    if (draft.id === null) {
      await createProductPriceRule.mutateAsync(payload);
      return;
    }

    await updateProductPriceRule.mutateAsync({
      id: draft.id,
      data: payload,
    });
  };

  const handleDeleteRule = async (index: number) => {
    const draft = ruleDrafts[index];
    if (!draft) {
      return;
    }

    if (draft.id === null) {
      setRuleDrafts((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
      return;
    }

    if (!window.confirm("Delete this pricing rule?")) {
      return;
    }

    await deleteProductPriceRule.mutateAsync(draft.id);
  };

  const handleAddRule = () => {
    setRuleDrafts((prev) => [...prev, createEmptyRuleDraft()]);
  };

  const handleBulkPricingChange = <K extends keyof BulkPricingFormState>(
    field: K,
    value: BulkPricingFormState[K],
  ) => {
    setBulkPricingForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitBulkPricing = async () => {
    const percentage = Number(bulkPricingForm.percentage);

    if (
      bulkPricingForm.action !== "reset" &&
      (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
    ) {
      showErrorToast("Percentage must be between 0 and 100.");
      return;
    }

    const payload: BulkUpdateProductPricingDto = {
      action: bulkPricingForm.action,
      vendor_ids: bulkPricingForm.vendorIds.map((value) => Number(value)),
      ...(bulkPricingForm.action === "reset" ? {} : { percentage }),
    };

    await bulkUpdateProductPricing.mutateAsync(payload);
  };

  const isRuleMutationPending =
    createProductPriceRule.isPending ||
    updateProductPriceRule.isPending ||
    deleteProductPriceRule.isPending ||
    bulkUpdateProductPricing.isPending;

  const vendorOptions = (vendorsData?.data ?? []).map((vendor: any) => ({
    value: String(vendor.id),
    label: vendor.name_en || vendor.name || String(vendor.id),
  }));
  const brandOptions = (brandsData?.data ?? []).map((brand: any) => ({
    value: String(brand.id),
    label: brand.name_en || brand.name_ar || String(brand.id),
  }));

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Percent />}
        title="Pricing Rules"
        description="Manage vendor-price rules and apply bulk pricing changes by vendor when needed."
      />

      <SettingsNav />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Bulk Product Pricing</h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Apply a percentage increase or decrease to current product prices, or
              reset products back to their stored original vendor prices.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Select
            label="Vendors"
            value={bulkPricingForm.vendorIds}
            onChange={(value) =>
              handleBulkPricingChange(
                "vendorIds",
                Array.isArray(value) ? value : value ? [value] : [],
              )
            }
            options={vendorOptions}
            multiple={true}
            placeholder="All vendors"
            search={vendorOptions.length > 6}
            disabled={bulkUpdateProductPricing.isPending || vendorOptions.length === 0}
          />
          <Select
            label="Action"
            value={bulkPricingForm.action}
            onChange={(value) =>
              handleBulkPricingChange(
                "action",
                (Array.isArray(value) ? value[0] : value || "increase") as BulkPricingFormState["action"],
              )
            }
            options={[
              { value: "increase", label: "Add Percentage" },
              { value: "decrease", label: "Minus Percentage" },
              { value: "reset", label: "Reset To Original Vendor Prices" },
            ]}
            search={false}
            disabled={bulkUpdateProductPricing.isPending}
          />
          <Input
            label="Percentage"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={bulkPricingForm.percentage}
            onChange={(event) =>
              handleBulkPricingChange("percentage", event.target.value)
            }
            disabled={
              bulkUpdateProductPricing.isPending ||
              bulkPricingForm.action === "reset"
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-r1 border border-primary/10 bg-primary/5 p-4">
          <p className="text-sm text-gray-600">
            Leave vendors empty to apply the action to all products.
          </p>
          <Button onClick={handleSubmitBulkPricing} disabled={isLoading || isRuleMutationPending}>
            {bulkUpdateProductPricing.isPending ? "Applying..." : "Apply Pricing Action"}
          </Button>
        </div>
      </Card>

      {importAiProductsEnabled ? (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-r1 bg-primary p-3 text-white">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    Product Pricing Rules
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Define persisted increase/decrease rules by vendor, brand,
                    category, and original-price conditions.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleAddRule}
              disabled={isLoading || isRuleMutationPending}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Rule
              </span>
            </Button>
          </div>

          {isError ? (
            <div className="rounded-r1 border border-danger/20 bg-danger/5 p-5">
              <div className="flex items-center gap-3 text-danger">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">
                  Unable to load AI import pricing rules
                </p>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {error instanceof Error
                  ? error.message
                  : "An error occurred while loading AI import pricing rules."}
              </p>
              <Button onClick={() => refetch()} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {ruleDrafts.length === 0 && !isLoading ? (
                <div className="rounded-r1 border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  No pricing rules yet. Add your first rule to control how
                  product prices are managed from original source prices.
                </div>
              ) : null}

              {ruleDrafts.map((rule, index) => (
                <Card key={rule.id ?? `new-rule-${index}`} variant="nested">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold">
                        {rule.id === null
                          ? `New Rule ${index + 1}`
                          : `Rule ${index + 1}`}
                      </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Define rule scope, product-price condition, and percentage
                    adjustment.
                  </p>
                    </div>

                    <Toggle
                      checked={rule.is_active}
                      onChange={(value) =>
                        setRuleField(index, "is_active", value)
                      }
                      disabled={isRuleMutationPending}
                      label="Active"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Select
                      label="Vendors"
                      value={rule.vendor_ids}
                      onChange={(value) =>
                        setRuleField(
                          index,
                          "vendor_ids",
                          Array.isArray(value) ? value : value ? [value] : [],
                        )
                      }
                      options={vendorOptions}
                      multiple={true}
                      placeholder="Any vendor"
                      search={vendorOptions.length > 6}
                      disabled={isRuleMutationPending}
                    />
                    <Select
                      label="Brands"
                      value={rule.brand_ids}
                      onChange={(value) =>
                        setRuleField(
                          index,
                          "brand_ids",
                          Array.isArray(value) ? value : value ? [value] : [],
                        )
                      }
                      options={brandOptions}
                      multiple={true}
                      placeholder="Any brand"
                      search={brandOptions.length > 6}
                      disabled={isRuleMutationPending}
                    />
                    <CategoryTreeSelect
                      categories={categoriesData ?? []}
                      selectedIds={rule.category_ids}
                      onChange={(ids) =>
                        setRuleField(index, "category_ids", ids)
                      }
                      singleSelect={false}
                      label="Categories"
                      placeholder="Any category"
                      disabled={isRuleMutationPending}
                    />
                    <Select
                      label="Condition"
                      value={rule.price_condition}
                      onChange={(value) =>
                        setRuleField(
                          index,
                          "price_condition",
                          ((Array.isArray(value) ? value[0] : value) ??
                            "") as ProductPriceRuleDraft["price_condition"],
                        )
                      }
                      options={[
                        { value: "any", label: "Any product price" },
                        { value: "more_than", label: "More than min" },
                        { value: "less_than", label: "Less than max" },
                        { value: "between", label: "Between min and max" },
                      ]}
                      placeholder="No price filter"
                      search={false}
                      disabled={isRuleMutationPending}
                    />
                    <Select
                      label="Adjustment"
                      value={rule.adjustment_type}
                      onChange={(value) =>
                        setRuleField(
                          index,
                          "adjustment_type",
                          ((Array.isArray(value) ? value[0] : value) ??
                            "") as ProductPriceRuleDraft["adjustment_type"],
                        )
                      }
                      options={[
                        { value: "decrease", label: "Decrease by percentage" },
                        { value: "increase", label: "Increase by percentage" },
                      ]}
                      placeholder="Select adjustment"
                      search={false}
                      disabled={isRuleMutationPending}
                    />
                    <Input
                      label="Minimum Product Price"
                      type="number"
                      min="0"
                      step="0.1"
                      value={rule.min_product_price}
                      onChange={(event) =>
                        setRuleField(
                          index,
                          "min_product_price",
                          event.target.value,
                        )
                      }
                      disabled={isRuleMutationPending}
                    />
                    <Input
                      label="Maximum Product Price"
                      type="number"
                      min="0"
                      step="0.1"
                      value={rule.max_product_price}
                      onChange={(event) =>
                        setRuleField(
                          index,
                          "max_product_price",
                          event.target.value,
                        )
                      }
                      disabled={isRuleMutationPending}
                    />
                    <Input
                      label="Percentage"
                      type="number"
                      min="1"
                      step="0.1"
                      value={rule.percentage}
                      onChange={(event) =>
                        setRuleField(index, "percentage", event.target.value)
                      }
                      disabled={isRuleMutationPending}
                    />
                  </div>

                  <p className="text-sm text-gray-500">
                    Leave vendors, brands, categories, and min/max product prices
                    empty to apply the rule to all products.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleSaveRule(index)}
                      disabled={isRuleMutationPending}
                    >
                      {rule.id === null
                        ? createProductPriceRule.isPending
                          ? "Creating..."
                          : "Create Rule"
                        : updateProductPriceRule.isPending
                          ? "Saving..."
                          : "Save Rule"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteRule(index)}
                      disabled={isRuleMutationPending}
                      color="#dc2626"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </span>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
