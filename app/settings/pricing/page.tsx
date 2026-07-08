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
import { useCategories } from "../../src/services/categories/hooks/use-categories";
import { useResolvedFeatureToggles } from "../../src/hooks/use-resolved-feature-toggles";
import { useEffect, useState } from "react";

type ProductPriceRuleDraft = {
  id: number | null;
  vendor_id: string;
  brand_id: string;
  category_ids: string[];
  price_condition: "any" | "more_than" | "less_than" | "between";
  adjustment_type: "increase" | "decrease";
  min_vendor_price: string;
  max_vendor_price: string;
  percentage: string;
  is_active: boolean;
};

const createEmptyRuleDraft = (): ProductPriceRuleDraft => ({
  id: null,
  vendor_id: "",
  brand_id: "",
  category_ids: [],
  price_condition: "between",
  adjustment_type: "decrease",
  min_vendor_price: "",
  max_vendor_price: "",
  percentage: "1",
  is_active: true,
});

const mapRuleToDraft = (rule: ProductPriceRule): ProductPriceRuleDraft => ({
  id: rule.id,
  vendor_id:
    rule.vendor_id === null || rule.vendor_id === undefined
      ? ""
      : String(rule.vendor_id),
  brand_id:
    rule.brand_id === null || rule.brand_id === undefined
      ? ""
      : String(rule.brand_id),
  category_ids: (rule.category_ids ?? []).map((categoryId) => String(categoryId)),
  price_condition: rule.price_condition ?? "between",
  adjustment_type: rule.adjustment_type ?? "decrease",
  min_vendor_price: String(rule.min_vendor_price ?? ""),
  max_vendor_price:
    rule.max_vendor_price === null || rule.max_vendor_price === undefined
      ? ""
      : String(rule.max_vendor_price),
  percentage: String(rule.percentage ?? "1"),
  is_active: rule.is_active ?? true,
});

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
    const vendorId = draft.vendor_id ? Number(draft.vendor_id) : null;
    const brandId = draft.brand_id ? Number(draft.brand_id) : null;
    const categoryIds = draft.category_ids.map((value) => Number(value));
    const minVendorPrice = Number(draft.min_vendor_price);
    const maxVendorPrice =
      draft.max_vendor_price.trim() === ""
        ? null
        : Number(draft.max_vendor_price);
    const percentage = Number(draft.percentage);

    if (!Number.isFinite(minVendorPrice) || minVendorPrice < 0) {
      showErrorToast("Minimum vendor price must be 0 or more");
      return null;
    }

    if (
      maxVendorPrice !== null &&
      (!Number.isFinite(maxVendorPrice) || maxVendorPrice < minVendorPrice)
    ) {
      showErrorToast(
        "Maximum vendor price must be greater than or equal to the minimum value",
      );
      return null;
    }

    if (!Number.isFinite(percentage) || percentage < 1) {
      showErrorToast("Percentage must be at least 1");
      return null;
    }

    if (
      draft.price_condition === "less_than" &&
      (maxVendorPrice === null || !Number.isFinite(maxVendorPrice))
    ) {
      showErrorToast("Less than condition needs a maximum original price");
      return null;
    }

    if (
      (vendorId !== null && (!Number.isInteger(vendorId) || vendorId < 1)) ||
      (brandId !== null && (!Number.isInteger(brandId) || brandId < 1)) ||
      categoryIds.some((categoryId) => !Number.isInteger(categoryId) || categoryId < 1)
    ) {
      showErrorToast("Vendor, brand, and category selections are invalid");
      return null;
    }

    return {
      vendor_id: vendorId,
      brand_id: brandId,
      category_ids: categoryIds.length > 0 ? categoryIds : null,
      price_condition: draft.price_condition,
      adjustment_type: draft.adjustment_type,
      min_vendor_price: minVendorPrice,
      max_vendor_price: maxVendorPrice,
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
  const flattenCategoryOptions = (
    nodes: any[],
    parentPath = "",
  ): Array<{ value: string; label: string }> => {
    const options: Array<{ value: string; label: string }> = [];

    for (const node of nodes) {
      const nodeName = node?.name_en || node?.name_ar || `#${node?.id ?? "?"}`;
      const label = parentPath ? `${parentPath} / ${nodeName}` : nodeName;
      if (node?.id) {
        options.push({ value: String(node.id), label });
      }

      if (Array.isArray(node?.children) && node.children.length > 0) {
        options.push(...flattenCategoryOptions(node.children, label));
      }
    }

    return options;
  };
  const categoryOptions = flattenCategoryOptions(categoriesData ?? []);

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
                          : `Rule #${rule.id}`}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Define rule scope, original-price condition, and
                        percentage adjustment.
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
                      label="Vendor"
                      value={rule.vendor_id}
                      onChange={(value) =>
                        setRuleField(
                          index,
                          "vendor_id",
                          (Array.isArray(value) ? value[0] : value) ?? "",
                        )
                      }
                      options={[
                        { value: "", label: "Any vendor" },
                        ...vendorOptions,
                      ]}
                      search={vendorOptions.length > 6}
                      disabled={isRuleMutationPending}
                    />
                    <Select
                      label="Brand"
                      value={rule.brand_id}
                      onChange={(value) =>
                        setRuleField(
                          index,
                          "brand_id",
                          (Array.isArray(value) ? value[0] : value) ?? "",
                        )
                      }
                      options={[
                        { value: "", label: "Any brand" },
                        ...brandOptions,
                      ]}
                      search={brandOptions.length > 6}
                      disabled={isRuleMutationPending}
                    />
                    <Select
                      label="Categories"
                      value={rule.category_ids}
                      onChange={(value) =>
                        setRuleField(
                          index,
                          "category_ids",
                          Array.isArray(value) ? value : value ? [value] : [],
                        )
                      }
                      options={categoryOptions}
                      multiple={true}
                      placeholder="Any category"
                      search={categoryOptions.length > 6}
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
                            "between") as ProductPriceRuleDraft["price_condition"],
                        )
                      }
                      options={[
                        { value: "any", label: "Any original price" },
                        { value: "more_than", label: "More than min" },
                        { value: "less_than", label: "Less than max" },
                        { value: "between", label: "Between min and max" },
                      ]}
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
                            "decrease") as ProductPriceRuleDraft["adjustment_type"],
                        )
                      }
                      options={[
                        { value: "decrease", label: "Decrease by percentage" },
                        { value: "increase", label: "Increase by percentage" },
                      ]}
                      search={false}
                      disabled={isRuleMutationPending}
                    />
                    <Input
                      label="Minimum Vendor Price"
                      type="number"
                      min="0"
                      step="0.1"
                      value={rule.min_vendor_price}
                      onChange={(event) =>
                        setRuleField(
                          index,
                          "min_vendor_price",
                          event.target.value,
                        )
                      }
                      disabled={isRuleMutationPending}
                    />
                    <Input
                      label="Maximum Vendor Price"
                      type="number"
                      min="0"
                      step="0.1"
                      value={rule.max_vendor_price}
                      onChange={(event) =>
                        setRuleField(
                          index,
                          "max_vendor_price",
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
