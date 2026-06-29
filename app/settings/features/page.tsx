"use client";

import { useEffect, useState } from "react";
import { AlertCircle, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Toggle } from "../../src/components/ui/toggle";
import { Button } from "../../src/components/ui/button";
import {
  useFeatureToggles,
  useUpdateFeatureToggles,
} from "../../src/services/settings/hooks/use-settings";
import { useResolvedFeatureToggles } from "../../src/hooks/use-resolved-feature-toggles";
import {
  readStoredFeatureToggles,
  toFeatureToggles,
  toUpdateFeatureTogglesDto,
} from "../../src/lib/feature-toggles-cache";
import type { UpdateFeatureTogglesDto } from "../../src/services/settings/types/settings.types";

const catalogFields: Array<{
  key: keyof UpdateFeatureTogglesDto;
  label: string;
  description: string;
}> = [
  {
    key: "vendors_enabled",
    label: "Vendors",
    description:
      "Show vendors in the admin panel and storefront, and accept vendor changes on product create/update.",
  },
  {
    key: "attributes_enabled",
    label: "Attributes",
    description:
      "Show product attributes in the admin panel, review workspace, storefront detail page, and filters.",
  },
  {
    key: "specifications_enabled",
    label: "Specifications",
    description:
      "Show product specifications in the admin panel, review workspace, and storefront detail page.",
  },
  {
    key: "weight_and_dimensions_enabled",
    label: "Weight & Dimensions",
    description:
      "Show weight, length, width, height, and their units in the admin panel and storefront cart/checkout.",
  },
  {
    key: "linked_products_enabled",
    label: "Linked Products",
    description:
      "Show linked products in the admin product form and the linked product chooser on the storefront detail page.",
  },
];

const platformModules: Array<{
  key: keyof UpdateFeatureTogglesDto;
  label: string;
  description: string;
}> = [
  {
    key: "partners_enabled",
    label: "Partners",
    description:
      "Show the Partners section in the admin panel and the Sell With Us partner form on the storefront.",
  },
  {
    key: "cashback_enabled",
    label: "Cashback & Wallet",
    description:
      "Show Cashback Rules in the admin panel and wallet balance, cashback preview, and wallet checkout on the storefront.",
  },
  {
    key: "banners_enabled",
    label: "Banners",
    description:
      "Show the Banners section in the admin panel and homepage hero banners on the storefront.",
  },
  {
    key: "import_ai_products_enabled",
    label: "Import AI Products",
    description:
      "Show Products Review and Updated Products in the admin panel, product status in the product form, and enable the AI import workflow.",
  },
];

const appearanceFields: Array<{
  key: keyof UpdateFeatureTogglesDto;
  label: string;
  description: string;
}> = [
  {
    key: "reference_link_visible_admin",
    label: "Reference Link",
    description:
      "Show the reference link input and vendor source prices in the admin product form, and its badge in the review workspace.",
  },
  {
    key: "meta_title_visible_admin",
    label: "Meta Title (EN/AR)",
    description: "Show the meta title inputs in the admin product form.",
  },
  {
    key: "meta_description_visible_admin",
    label: "Meta Description (EN/AR)",
    description: "Show the meta description inputs in the admin product form.",
  },
];

function FeatureToggleSkeletonGrid({ count }: { count: number }) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center justify-between rounded-lg bg-gray-50 p-4"
          aria-hidden="true"
        >
          <div className="flex-1 space-y-2 pr-4">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-3 w-full max-w-md rounded bg-gray-200" />
          </div>
          <div className="h-6 w-11 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

function createInitialFormState(): UpdateFeatureTogglesDto {
  const stored = readStoredFeatureToggles();
  if (!stored) {
    return {};
  }

  return toUpdateFeatureTogglesDto(toFeatureToggles(stored));
}

export default function FeatureSettingsPage() {
  const { data, isError, error, refetch } = useFeatureToggles();
  const { isVisibilityPending } = useResolvedFeatureToggles();
  const updateFeatureToggles = useUpdateFeatureToggles();
  const [formState, setFormState] =
    useState<UpdateFeatureTogglesDto>(createInitialFormState);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState(toUpdateFeatureTogglesDto(data));
  }, [data]);

  const setField = (field: keyof UpdateFeatureTogglesDto, value: boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await updateFeatureToggles.mutateAsync(toUpdateFeatureTogglesDto(formState));
  };

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center gap-5 p-5">
        <PageHeader
          icon={<SlidersHorizontal />}
          title="Feature Settings"
          description="Enable or disable storefront and admin panel modules."
        />
        <SettingsNav />
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold">Error Loading Feature Settings</h3>
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

  const saving = updateFeatureToggles.isPending;
  const togglesReady = !isVisibilityPending;

  const renderToggleGrid = (
    fields: Array<{
      key: keyof UpdateFeatureTogglesDto;
      label: string;
      description: string;
    }>,
  ) => {
    if (!togglesReady) {
      return <FeatureToggleSkeletonGrid count={fields.length} />;
    }

    return (
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.key}
            className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
          >
            <div className="pr-4">
              <p className="font-medium">{field.label}</p>
              <p className="text-sm text-gray-500">{field.description}</p>
            </div>
            <Toggle
              checked={formState[field.key] === true}
              onChange={(value) => setField(field.key, value)}
              disabled={saving}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<SlidersHorizontal />}
        title="Feature Settings"
        description="Enable or disable modules across the admin panel and client storefront."
        action={{
          label: saving ? "Saving..." : "Save Settings",
          onClick: handleSave,
          disabled: !togglesReady || saving,
        }}
      />

      <SettingsNav />

      <Card>
        <h2 className="text-lg font-semibold">Catalog & product data</h2>
        <p className="mt-1 text-sm text-gray-500">
          Disabling a field removes it from the admin panel and storefront. Existing
          data stays in the database and returns when the feature is enabled again.
        </p>
        {renderToggleGrid(catalogFields)}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Platform modules</h2>
        <p className="mt-1 text-sm text-gray-500">
          Control partner onboarding and wallet/cashback experiences on both the admin
          panel and the client site.
        </p>
        {renderToggleGrid(platformModules)}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Admin-only appearance</h2>
        <p className="mt-1 text-sm text-gray-500">
          These toggles affect only the admin dashboard UI. They do not change backend
          storage or the client storefront.
        </p>
        {renderToggleGrid(appearanceFields)}
      </Card>
    </div>
  );
}
