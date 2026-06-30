"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Palette } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import {
  ColorField,
  createEmptyBrandThemeFormState,
  DEFAULT_BRAND_THEME,
  mapBrandThemeToFormState,
} from "../../src/components/settings/ColorField";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import {
  useSeoSettings,
  useUpdateSeoSettings,
} from "../../src/services/settings/hooks/use-settings";
import {
  BRAND_THEME_FIELDS,
  resolveBrandTheme,
  toBrandThemePayload,
  type BrandThemeColorKey,
} from "../../src/lib/brand-theme";

export default function AppearanceSettingsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useSeoSettings();
  const updateSeoSettings = useUpdateSeoSettings();
  const [formState, setFormState] = useState(createEmptyBrandThemeFormState);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState(mapBrandThemeToFormState(data));
  }, [data]);

  const previewTheme = useMemo(
    () => resolveBrandTheme(formState),
    [formState],
  );

  const setField = (field: BrandThemeColorKey, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetField = (field: BrandThemeColorKey) => {
    setFormState((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSave = async () => {
    await updateSeoSettings.mutateAsync(toBrandThemePayload(formState));
    router.refresh();
  };

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center gap-5 p-5">
        <PageHeader
          icon={<Palette />}
          title="Appearance"
          description="Manage admin panel brand colors."
        />
        <SettingsNav />
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold">Error Loading Appearance Settings</h3>
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
        icon={<Palette />}
        title="Appearance"
        description="Customize admin panel colors. Empty fields use the defaults from globals.css."
        action={{
          label: updateSeoSettings.isPending ? "Saving..." : "Save Settings",
          onClick: handleSave,
          disabled: isLoading || updateSeoSettings.isPending,
        }}
      />

      <SettingsNav />

      <Card>
        <h2 className="text-lg font-semibold">Brand Colors</h2>
        <p className="mt-1 text-sm text-gray-500">
          Saved colors are stored in the database and applied across the admin
          panel. Leave a field empty to fall back to the built-in default.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          {BRAND_THEME_FIELDS.map((field) => (
            <ColorField
              key={field.key}
              label={field.label}
              value={formState[field.key]}
              defaultValue={DEFAULT_BRAND_THEME[field.key]}
              onChange={(value) => setField(field.key, value)}
              onReset={() => resetField(field.key)}
              disabled={isLoading || updateSeoSettings.isPending}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Live Preview</h2>
        <p className="mt-1 text-sm text-gray-500">
          Preview uses saved values when present, otherwise the default palette.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {BRAND_THEME_FIELDS.map((field) => (
            <div
              key={field.key}
              className="min-w-28 rounded-r1 border border-primary/15 p-3 text-center"
            >
              <div
                className="mx-auto h-12 w-12 rounded-r2 border border-black/5"
                style={{ backgroundColor: previewTheme[field.key] }}
              />
              <p className="mt-2 text-xs font-medium">{field.label}</p>
              <p className="text-[11px] text-gray-500">{previewTheme[field.key]}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-r1 px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: previewTheme.brand_primary }}
            disabled={isLoading || updateSeoSettings.isPending}
          >
            Primary Button
          </button>
          <button
            type="button"
            className="rounded-r1 border px-4 py-2 text-sm font-medium"
            style={{
              borderColor: previewTheme.brand_primary,
              color: previewTheme.brand_primary,
            }}
            disabled={isLoading || updateSeoSettings.isPending}
          >
            Outline Button
          </button>
          <span
            className="inline-flex items-center rounded-r1 px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: `${previewTheme.brand_success}26`,
              color: previewTheme.brand_success,
            }}
          >
            Success
          </span>
          <span
            className="inline-flex items-center rounded-r1 px-3 py-2 text-sm font-medium"
            style={{
              backgroundColor: `${previewTheme.brand_danger}26`,
              color: previewTheme.brand_danger,
            }}
          >
            Danger
          </span>
        </div>
      </Card>
    </div>
  );
}
