"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Boxes } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Toggle } from "../../src/components/ui/toggle";
import { Button } from "../../src/components/ui/button";
import {
  useProductFieldToggles,
  useUpdateProductFieldToggles,
} from "../../src/services/settings/hooks/use-settings";
import type {
  ProductFieldToggles,
  UpdateProductFieldTogglesDto,
} from "../../src/services/settings/types/settings.types";

const emptyToggles: ProductFieldToggles = {
  id: 0,
  vendors_enabled: true,
  attributes_enabled: true,
  specifications_enabled: true,
  weight_and_dimensions_enabled: true,
  reference_link_visible_admin: true,
  meta_title_visible_admin: true,
  meta_description_visible_admin: true,
};

const disablingFields: Array<{
  key: keyof UpdateProductFieldTogglesDto;
  label: string;
  description: string;
}> = [
  {
    key: "vendors_enabled",
    label: "Vendors",
    description:
      "Show the vendor field in the product form, the review workspace, and the storefront, and accept vendor changes on create/update.",
  },
  {
    key: "attributes_enabled",
    label: "Attributes",
    description:
      "Show product attributes in the form, the review workspace, the storefront detail page, and the storefront filters.",
  },
  {
    key: "specifications_enabled",
    label: "Specifications",
    description:
      "Show product specifications in the form, the review workspace, and the storefront detail page.",
  },
  {
    key: "weight_and_dimensions_enabled",
    label: "Weight & Dimensions",
    description:
      "Show weight, length, width, height, and their units in the form and the storefront detail, cart, and checkout.",
  },
];

const appearanceFields: Array<{
  key: keyof UpdateProductFieldTogglesDto;
  label: string;
  description: string;
}> = [
  {
    key: "reference_link_visible_admin",
    label: "Reference Link",
    description:
      "Show the reference link input in the admin product form and its badge in the review workspace.",
  },
  {
    key: "meta_title_visible_admin",
    label: "Meta Title (EN/AR)",
    description:
      "Show the meta title inputs in the admin product form.",
  },
  {
    key: "meta_description_visible_admin",
    label: "Meta Description (EN/AR)",
    description:
      "Show the meta description inputs in the admin product form.",
  },
];

export default function ProductFieldsSettingsPage() {
  const { data, isLoading, isError, error, refetch } =
    useProductFieldToggles();
  const updateProductFieldToggles = useUpdateProductFieldToggles();
  const [formState, setFormState] =
    useState<UpdateProductFieldTogglesDto>(emptyToggles);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState({
      vendors_enabled: data.vendors_enabled ?? true,
      attributes_enabled: data.attributes_enabled ?? true,
      specifications_enabled: data.specifications_enabled ?? true,
      weight_and_dimensions_enabled:
        data.weight_and_dimensions_enabled ?? true,
      reference_link_visible_admin: data.reference_link_visible_admin ?? true,
      meta_title_visible_admin: data.meta_title_visible_admin ?? true,
      meta_description_visible_admin:
        data.meta_description_visible_admin ?? true,
    });
  }, [data]);

  const setField = (
    field: keyof UpdateProductFieldTogglesDto,
    value: boolean,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await updateProductFieldToggles.mutateAsync(formState);
  };

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center gap-5 p-5">
        <PageHeader
          icon={<Boxes />}
          title="Product Fields"
          description="Enable or disable product fields and control admin-only input visibility."
        />
        <SettingsNav />
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold">
              Error Loading Product Field Settings
            </h3>
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

  const saving = updateProductFieldToggles.isPending;

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<Boxes />}
        title="Product Fields"
        description="Enable or disable product fields and control admin-only input visibility."
        action={{
          label: saving ? "Saving..." : "Save Settings",
          onClick: handleSave,
          disabled: isLoading || saving,
        }}
      />

      <SettingsNav />

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Enabled fields</h2>
            <p className="mt-1 text-sm text-gray-500">
              Disabling a field removes it from the admin form, the admin review
              workspace, the client storefront, and drops any new
              create/edit payload sent to the backend. Existing product data
              for that field is preserved in the database and re-served where
              the field is allowed again — nothing is purged.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {disablingFields.map((field) => (
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
                disabled={isLoading || saving}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Admin dashboard appearance</h2>
        <p className="mt-1 text-sm text-gray-500">
          These toggles affect only the admin dashboard UI. They do not change
          what the backend stores and do not affect the client storefront.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {appearanceFields.map((field) => (
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
                disabled={isLoading || saving}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
