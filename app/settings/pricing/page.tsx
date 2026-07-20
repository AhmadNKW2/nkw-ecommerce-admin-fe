"use client";

import { AlertCircle, CheckCircle2, Percent, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Toggle } from "../../src/components/ui/toggle";
import { Button } from "../../src/components/ui/button";
import { Select } from "../../src/components/ui/select";
import { showErrorToast } from "../../src/lib/toast";
import {
  useCancelProductPricingJob,
  useCreateProductPriceRule,
  useDeleteProductPriceRule,
  useProductPriceRules,
  useUpdateProductPriceRule,
  useVerifyAndFixProductPricing,
} from "../../src/services/settings/hooks/use-settings";
import {
  CreateProductPriceRuleDto,
  ProductPriceRule,
  ProductPricingJobStatus,
} from "../../src/services/settings/types/settings.types";
import { useVendors } from "../../src/services/vendors/hooks/use-vendors";
import { useBrands } from "../../src/services/brands/hooks/use-brands";
import { CategoryTreeSelect } from "../../src/components/products/CategoryTreeSelect";
import { useResolvedFeatureToggles } from "../../src/hooks/use-resolved-feature-toggles";
import { useCategories } from "../../src/services/categories/hooks/use-categories";

import { useEffect, useMemo, useState } from "react";

type ProductPriceRuleDraft = {
  id: number | null;
  vendor_ids: string[];
  brand_ids: string[];
  category_ids: string[];
  /** Empty/null means any product price (no price filter). */
  price_condition: "" | "more_than" | "less_than" | "between";
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

const mapPriceConditionToDraft = (
  condition: ProductPriceRule["price_condition"] | null | undefined,
): ProductPriceRuleDraft["price_condition"] => {
  if (!condition || condition === "any") {
    return "";
  }

  return condition;
};

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
  const priceCondition = mapPriceConditionToDraft(rule.price_condition);
  const minProductPrice =
    rule.min_product_price ?? legacyRule.min_vendor_price ?? null;
  const maxProductPrice =
    rule.max_product_price ?? legacyRule.max_vendor_price ?? null;

  return {
    id: rule.id,
    vendor_ids: vendorIds.map((vendorId) => String(vendorId)),
    brand_ids: brandIds.map((brandId) => String(brandId)),
    category_ids: (rule.category_ids ?? []).map((categoryId) => String(categoryId)),
    price_condition: priceCondition,
    adjustment_type: rule.adjustment_type ?? "decrease",
    min_product_price:
      priceCondition === "" || priceCondition === "less_than"
        ? ""
        : minProductPrice === null || minProductPrice === undefined
          ? ""
          : String(minProductPrice),
    max_product_price:
      priceCondition === "" || priceCondition === "more_than"
        ? ""
        : maxProductPrice === null || maxProductPrice === undefined
          ? ""
          : String(maxProductPrice),
    percentage: String(rule.percentage ?? "1"),
    is_active: rule.is_active ?? true,
  };
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
  const verifyAndFixProductPricing = useVerifyAndFixProductPricing();
  const cancelProductPricingJob = useCancelProductPricingJob();
  const [ruleDrafts, setRuleDrafts] = useState<ProductPriceRuleDraft[]>([]);
  const [pricingJobId, setPricingJobId] = useState<string | null>(null);
  const [pricingJobStatus, setPricingJobStatus] =
    useState<ProductPricingJobStatus | null>(null);

  useEffect(() => {
    if (!pricingRules) {
      return;
    }

    setRuleDrafts(pricingRules.map(mapRuleToDraft));
  }, [pricingRules]);

  useEffect(() => {
    if (!pricingJobId) {
      return;
    }

    const eventSource = new EventSource(
      `/api/settings/pricing-rules/jobs/${pricingJobId}/stream`,
      { withCredentials: true },
    );

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const status = (parsed?.data ?? parsed) as ProductPricingJobStatus;
        setPricingJobStatus(status);

        if (status?.status && status.status !== "running") {
          eventSource.close();
        }
      } catch {
        // ignore malformed SSE payloads
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [pricingJobId]);

  const trackPricingJob = (jobId: string | null | undefined) => {
    if (!jobId) {
      return;
    }

    setPricingJobId(jobId);
    setPricingJobStatus(null);
  };

  const setRuleField = <K extends keyof ProductPriceRuleDraft>(
    index: number,
    field: K,
    value: ProductPriceRuleDraft[K],
  ) => {
    setRuleDrafts((prev) =>
      prev.map((rule, currentIndex) => {
        if (currentIndex !== index) {
          return rule;
        }

        if (field !== "price_condition") {
          return { ...rule, [field]: value };
        }

        const nextCondition = value as ProductPriceRuleDraft["price_condition"];

        return {
          ...rule,
          price_condition: nextCondition,
          min_product_price:
            nextCondition === "more_than" || nextCondition === "between"
              ? rule.min_product_price
              : "",
          max_product_price:
            nextCondition === "less_than" || nextCondition === "between"
              ? rule.max_product_price
              : "",
        };
      }),
    );
  };

  const buildRulePayload = (
    draft: ProductPriceRuleDraft,
  ): CreateProductPriceRuleDto | null => {
    const vendorIds = draft.vendor_ids.map((value) => Number(value));
    const brandIds = draft.brand_ids.map((value) => Number(value));
    const categoryIds = draft.category_ids.map((value) => Number(value));
    const priceCondition =
      draft.price_condition === "" ? null : draft.price_condition;
    const minProductPrice =
      priceCondition === "more_than" || priceCondition === "between"
        ? draft.min_product_price.trim() === ""
          ? null
          : Number(draft.min_product_price)
        : null;
    const maxProductPrice =
      priceCondition === "less_than" || priceCondition === "between"
        ? draft.max_product_price.trim() === ""
          ? null
          : Number(draft.max_product_price)
        : null;
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

    if (priceCondition === "more_than" && minProductPrice === null) {
      showErrorToast("More than condition needs a minimum product price");
      return null;
    }

    if (priceCondition === "less_than" && maxProductPrice === null) {
      showErrorToast("Less than condition needs a maximum product price");
      return null;
    }

    if (
      priceCondition === "between" &&
      (minProductPrice === null || maxProductPrice === null)
    ) {
      showErrorToast("Between condition needs both minimum and maximum prices");
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
      // Null condition means any product price (no price filter).
      price_condition: priceCondition,
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

    if (isPricingJobActive) {
      showErrorToast("Wait for the current pricing job to finish");
      return;
    }

    const payload = buildRulePayload(draft);
    if (!payload) {
      return;
    }

    if (draft.id === null) {
      const response = await createProductPriceRule.mutateAsync(payload);
      trackPricingJob(response.data.reprice_job_id);
      return;
    }

    const response = await updateProductPriceRule.mutateAsync({
      id: draft.id,
      data: payload,
    });
    trackPricingJob(response.data.reprice_job_id);
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

    if (isPricingJobActive) {
      showErrorToast("Wait for the current pricing job to finish");
      return;
    }

    if (!window.confirm("Delete this pricing rule?")) {
      return;
    }

    const response = await deleteProductPriceRule.mutateAsync(draft.id);
    trackPricingJob(response.data.reprice_job_id);
  };

  const handleVerifyAndFixPricing = async () => {
    if (isPricingJobActive) {
      showErrorToast("Wait for the current pricing job to finish");
      return;
    }

    const response = await verifyAndFixProductPricing.mutateAsync();
    trackPricingJob(response.data.job_id);
  };

  const handleCancelPricingJob = async () => {
    if (!pricingJobId) {
      return;
    }

    await cancelProductPricingJob.mutateAsync(pricingJobId);
  };

  const handleAddRule = () => {
    setRuleDrafts((prev) => [...prev, createEmptyRuleDraft()]);
  };

  const isPricingJobActive =
    !!pricingJobId &&
    (!pricingJobStatus || pricingJobStatus.status === "running");

  const isRuleMutationPending =
    createProductPriceRule.isPending ||
    updateProductPriceRule.isPending ||
    deleteProductPriceRule.isPending ||
    verifyAndFixProductPricing.isPending ||
    isPricingJobActive;

  const pricingJobProgressPercent = useMemo(() => {
    if (!pricingJobStatus || pricingJobStatus.total <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((pricingJobStatus.progress / pricingJobStatus.total) * 100),
    );
  }, [pricingJobStatus]);

  const pricingJobBadgeClass =
    pricingJobStatus?.status === "done"
      ? "bg-success/15 text-success"
      : pricingJobStatus?.status === "failed"
        ? "bg-danger/15 text-danger"
        : pricingJobStatus?.status === "cancelled"
          ? "bg-warning/20 text-warning"
          : "bg-primary/15 text-primary";

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
        description="Define pricing rules that automatically manage product prices from their original prices."
      />

      <SettingsNav />

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
                    category, and original-price conditions. Saving a rule
                    recalculates product prices in a background job.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleVerifyAndFixPricing}
                disabled={isLoading || isRuleMutationPending}
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {verifyAndFixProductPricing.isPending
                    ? "Starting..."
                    : "Verify & Fix Pricing"}
                </span>
              </Button>
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
          </div>

          {pricingJobId ? (
            <div className="rounded-r1 border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">
                    {pricingJobStatus?.mode === "verify_and_fix"
                      ? "Verify & Fix Job"
                      : "Reprice Job"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Job ID: {pricingJobStatus?.job_id ?? pricingJobId}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${pricingJobBadgeClass}`}
                >
                  {(pricingJobStatus?.status ?? "running").toUpperCase()}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p>
                  Processed: {pricingJobStatus?.progress ?? 0} /{" "}
                  {pricingJobStatus?.total ?? "…"}
                  {" · "}
                  Left: {pricingJobStatus?.remaining ?? "…"}
                  {" · "}
                  Changed: {pricingJobStatus?.changed_count ?? 0}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pricingJobProgressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {pricingJobStatus
                    ? `${pricingJobProgressPercent}% completed`
                    : "Connecting to job stream..."}
                </p>
                {pricingJobStatus?.current_product_id ? (
                  <p className="text-xs text-gray-500">
                    Current product ID: {pricingJobStatus.current_product_id}
                  </p>
                ) : null}
                {pricingJobStatus?.message ? (
                  <p className="text-sm text-gray-600">{pricingJobStatus.message}</p>
                ) : null}
                {pricingJobStatus?.error ? (
                  <p className="text-danger">{pricingJobStatus.error}</p>
                ) : null}
              </div>

              {(pricingJobStatus?.status ?? "running") === "running" ? (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    color="#dc2626"
                    onClick={handleCancelPricingJob}
                    disabled={cancelProductPricingJob.isPending}
                  >
                    {cancelProductPricingJob.isPending
                      ? "Cancelling..."
                      : "Cancel Job"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

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
                        { value: "more_than", label: "More than min" },
                        { value: "less_than", label: "Less than max" },
                        { value: "between", label: "Between min and max" },
                      ]}
                      placeholder="Any product price"
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
                    {rule.price_condition === "more_than" ||
                    rule.price_condition === "between" ? (
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
                    ) : null}
                    {rule.price_condition === "less_than" ||
                    rule.price_condition === "between" ? (
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
                    ) : null}
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
                    Leave vendors, brands, categories, and condition empty to
                    apply the rule to any product price. Products with no matching
                    rule keep their original price and original sale price.
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
