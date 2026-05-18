"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Percent, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Card } from "../src/components/ui/card";
import { Input } from "../src/components/ui/input";
import { Textarea } from "../src/components/ui/textarea";
import { Toggle } from "../src/components/ui/toggle";
import { Button } from "../src/components/ui/button";
import { PageHeader } from "../src/components/common/PageHeader";
import { showErrorToast } from "../src/lib/toast";
import {
  useCreateProductPriceRule,
  useDeleteProductPriceRule,
  useProductPriceRules,
  useRepriceExistingProducts,
  useSeoSettings,
  useUpdateProductPriceRule,
  useUpdateSeoSettings,
} from "../src/services/settings/hooks/use-settings";
import {
  CreateProductPriceRuleDto,
  ProductPriceRule,
  UpdateSeoSettingsDto,
} from "../src/services/settings/types/settings.types";

type FormState = {
  site_name_en: string;
  site_name_ar: string;
  default_meta_title_en: string;
  default_meta_title_ar: string;
  default_meta_description_en: string;
  default_meta_description_ar: string;
  default_og_image: string;
  twitter_handle: string;
  google_verification: string;
  robots_index: boolean;
  robots_follow: boolean;
};

const emptyFormState: FormState = {
  site_name_en: "",
  site_name_ar: "",
  default_meta_title_en: "",
  default_meta_title_ar: "",
  default_meta_description_en: "",
  default_meta_description_ar: "",
  default_og_image: "",
  twitter_handle: "",
  google_verification: "",
  robots_index: true,
  robots_follow: true,
};

type ProductPriceRuleDraft = {
  id: number | null;
  min_vendor_price: string;
  max_vendor_price: string;
  percentage: string;
  is_active: boolean;
};

const createEmptyRuleDraft = (): ProductPriceRuleDraft => ({
  id: null,
  min_vendor_price: "",
  max_vendor_price: "",
  percentage: "1",
  is_active: true,
});

const mapRuleToDraft = (rule: ProductPriceRule): ProductPriceRuleDraft => ({
  id: rule.id,
  min_vendor_price: String(rule.min_vendor_price ?? ""),
  max_vendor_price:
    rule.max_vendor_price === null || rule.max_vendor_price === undefined
      ? ""
      : String(rule.max_vendor_price),
  percentage: String(rule.percentage ?? "1"),
  is_active: rule.is_active ?? true,
});

export default function SettingsPage() {
  const { data, isLoading, isError, error, refetch } = useSeoSettings();
  const {
    data: pricingRules,
    isLoading: isPricingRulesLoading,
    isError: isPricingRulesError,
    error: pricingRulesError,
    refetch: refetchPricingRules,
  } = useProductPriceRules();
  const updateSeoSettings = useUpdateSeoSettings();
  const createProductPriceRule = useCreateProductPriceRule();
  const updateProductPriceRule = useUpdateProductPriceRule();
  const deleteProductPriceRule = useDeleteProductPriceRule();
  const repriceExistingProducts = useRepriceExistingProducts();
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [ruleDrafts, setRuleDrafts] = useState<ProductPriceRuleDraft[]>([]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState({
      site_name_en: data.site_name_en ?? "",
      site_name_ar: data.site_name_ar ?? "",
      default_meta_title_en: data.default_meta_title_en ?? "",
      default_meta_title_ar: data.default_meta_title_ar ?? "",
      default_meta_description_en: data.default_meta_description_en ?? "",
      default_meta_description_ar: data.default_meta_description_ar ?? "",
      default_og_image: data.default_og_image ?? "",
      twitter_handle: data.twitter_handle ?? "",
      google_verification: data.google_verification ?? "",
      robots_index: data.robots_index ?? true,
      robots_follow: data.robots_follow ?? true,
    });
  }, [data]);

  useEffect(() => {
    if (!pricingRules) {
      return;
    }

    setRuleDrafts(pricingRules.map(mapRuleToDraft));
  }, [pricingRules]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

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
      showErrorToast("Maximum vendor price must be greater than or equal to the minimum value");
      return null;
    }

    if (!Number.isFinite(percentage) || percentage < 1) {
      showErrorToast("Percentage must be at least 1");
      return null;
    }

    return {
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

  const handleRepriceExistingProducts = async () => {
    if (
      !window.confirm(
        "This will treat the higher current value as the original vendor price before sale, the lower current value as the original vendor sale price after sale, then reduce both storefront prices by 1% for all existing products. Continue?",
      )
    ) {
      return;
    }

    await repriceExistingProducts.mutateAsync();
  };

  const isRuleMutationPending =
    createProductPriceRule.isPending ||
    updateProductPriceRule.isPending ||
    deleteProductPriceRule.isPending ||
    repriceExistingProducts.isPending;

  const handleSave = async () => {
    const payload: UpdateSeoSettingsDto = {
      site_name_en: formState.site_name_en,
      site_name_ar: formState.site_name_ar,
      default_meta_title_en: formState.default_meta_title_en,
      default_meta_title_ar: formState.default_meta_title_ar,
      default_meta_description_en: formState.default_meta_description_en,
      default_meta_description_ar: formState.default_meta_description_ar,
      default_og_image: formState.default_og_image || null,
      twitter_handle: formState.twitter_handle || null,
      google_verification: formState.google_verification || null,
      robots_index: formState.robots_index,
      robots_follow: formState.robots_follow,
    };

    await updateSeoSettings.mutateAsync(payload);
  };

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center gap-5 p-5">
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="text-xl font-bold mt-4">Error Loading SEO Settings</h3>
            <p className="mt-2 max-w-md mx-auto">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<Search />}
        title="Settings"
        description="Manage SEO defaults and product pricing rules used across the platform."
        action={{
          label: updateSeoSettings.isPending ? "Saving..." : "Save Settings",
          onClick: handleSave,
          disabled: isLoading || updateSeoSettings.isPending,
        }}
      />

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">SEO Settings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage the site-wide metadata defaults used by the storefront.
            </p>
          </div>
        </div>

        <h3 className="text-base font-semibold">Site Identity</h3>

        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Site Name (English)"
            value={formState.site_name_en}
            onChange={(event) => setField("site_name_en", event.target.value)}
            maxLength={120}
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <Input
            label="Site Name (Arabic)"
            value={formState.site_name_ar}
            onChange={(event) => setField("site_name_ar", event.target.value)}
            maxLength={120}
            isRtl
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <Input
            label="Default Meta Title (English)"
            value={formState.default_meta_title_en}
            onChange={(event) => setField("default_meta_title_en", event.target.value)}
            maxLength={70}
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <Input
            label="Default Meta Title (Arabic)"
            value={formState.default_meta_title_ar}
            onChange={(event) => setField("default_meta_title_ar", event.target.value)}
            maxLength={70}
            isRtl
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <Textarea
            label="Default Meta Description (English)"
            value={formState.default_meta_description_en}
            onChange={(event) => setField("default_meta_description_en", event.target.value)}
            maxLength={160}
            rows={4}
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <Textarea
            label="Default Meta Description (Arabic)"
            value={formState.default_meta_description_ar}
            onChange={(event) => setField("default_meta_description_ar", event.target.value)}
            maxLength={160}
            rows={4}
            isRtl
            disabled={isLoading || updateSeoSettings.isPending}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-base font-semibold">Search & Social</h3>

        <div className="grid grid-cols-2 gap-5">
          <Input
            label="Default OG Image URL"
            value={formState.default_og_image}
            onChange={(event) => setField("default_og_image", event.target.value)}
            maxLength={2048}
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <Input
            label="Twitter Handle"
            value={formState.twitter_handle}
            onChange={(event) => setField("twitter_handle", event.target.value)}
            maxLength={255}
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <Input
            label="Google Verification"
            value={formState.google_verification}
            onChange={(event) => setField("google_verification", event.target.value)}
            maxLength={255}
            disabled={isLoading || updateSeoSettings.isPending}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <p className="font-medium">Allow Indexing</p>
                <p className="text-sm text-gray-500">Controls the global `robots.index` metadata.</p>
              </div>
              <Toggle
                checked={formState.robots_index}
                onChange={(value) => setField("robots_index", value)}
                disabled={isLoading || updateSeoSettings.isPending}
              />
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <p className="font-medium">Allow Following Links</p>
                <p className="text-sm text-gray-500">Controls the global `robots.follow` metadata.</p>
              </div>
              <Toggle
                checked={formState.robots_follow}
                onChange={(value) => setField("robots_follow", value)}
                disabled={isLoading || updateSeoSettings.isPending}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-r1 bg-primary p-3 text-white">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Product Pricing Rules</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-3xl">
                  Product imports use vendor original price for price and vendor original sale price for sale. Both values are reduced by the matching percentage rule, rounded down to the nearest 0.10, and sale is forced below price when needed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleAddRule}
              disabled={isPricingRulesLoading || isRuleMutationPending}
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Rule
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={handleRepriceExistingProducts}
              disabled={isPricingRulesLoading || isRuleMutationPending}
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                {repriceExistingProducts.isPending ? "Repricing..." : "Bulk Reprice Existing Products"}
              </span>
            </Button>
          </div>
        </div>

        {isPricingRulesError ? (
          <div className="rounded-r1 border border-danger/20 bg-danger/5 p-5">
            <div className="flex items-center gap-3 text-danger">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Unable to load pricing rules</p>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {pricingRulesError instanceof Error ? pricingRulesError.message : "An error occurred while loading pricing rules."}
            </p>
            <Button onClick={() => refetchPricingRules()} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-r1 bg-gray-50 p-4 text-sm text-gray-600">
              Imported prices always use the matching rule for the vendor original amount. If no upper bound is needed, leave maximum vendor price empty. The bulk action reads the current catalog values, keeps the higher one as the before-sale vendor price and the lower one as the after-sale vendor sale price, then applies a fixed 1% reduction with the last decimal digit forced to 0.
            </div>

            <div className="flex flex-col gap-4">
              {ruleDrafts.length === 0 && !isPricingRulesLoading ? (
                <div className="rounded-r1 border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  No pricing rules yet. Add your first range to control imported product prices.
                </div>
              ) : null}

              {ruleDrafts.map((rule, index) => (
                <Card key={rule.id ?? `new-rule-${index}`} variant="nested">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold">
                        {rule.id === null ? `New Rule ${index + 1}` : `Rule #${rule.id}`}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Define the vendor price range and the percentage to reduce from it.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={rule.is_active}
                        onChange={(value) => setRuleField(index, "is_active", value)}
                        disabled={isRuleMutationPending}
                        label="Active"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Input
                      label="Minimum Vendor Price"
                      type="number"
                      min="0"
                      step="0.1"
                      value={rule.min_vendor_price}
                      onChange={(event) => setRuleField(index, "min_vendor_price", event.target.value)}
                      disabled={isRuleMutationPending}
                    />

                    <Input
                      label="Maximum Vendor Price"
                      type="number"
                      min="0"
                      step="0.1"
                      value={rule.max_vendor_price}
                      onChange={(event) => setRuleField(index, "max_vendor_price", event.target.value)}
                      disabled={isRuleMutationPending}
                    />

                    <Input
                      label="Reduction Percentage"
                      type="number"
                      min="1"
                      step="0.1"
                      value={rule.percentage}
                      onChange={(event) => setRuleField(index, "percentage", event.target.value)}
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
          </>
        )}
      </Card>
    </div>
  );
}