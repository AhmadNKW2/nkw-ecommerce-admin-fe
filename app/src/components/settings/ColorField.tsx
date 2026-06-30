"use client";

import { Input } from "../ui/input";
import {
  DEFAULT_BRAND_THEME,
  type BrandThemeColorKey,
} from "@/lib/brand-theme";

type ColorFieldProps = {
  label: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
  onReset: () => void;
  disabled?: boolean;
};

export function ColorField({
  label,
  value,
  defaultValue,
  onChange,
  onReset,
  disabled = false,
}: ColorFieldProps) {
  const displayColor = value || defaultValue;

  return (
    <div className="rounded-r1 border border-primary/15 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-xs text-gray-500">
            Default: {defaultValue}
          </p>
        </div>
        <div
          className="h-10 w-10 shrink-0 rounded-r2 border border-primary/20 shadow-sm"
          style={{ backgroundColor: displayColor }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex min-w-35 flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Picker</label>
          <input
            type="color"
            value={displayColor}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="h-13 w-full cursor-pointer rounded-r1 border border-primary/20 bg-white p-1 disabled:cursor-not-allowed"
          />
        </div>

        <div className="min-w-40 flex-1">
          <Input
            label="Hex"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            maxLength={7}
          />
        </div>

        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="h-13 rounded-r1 border border-primary/20 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use default
        </button>
      </div>
    </div>
  );
}

export function createEmptyBrandThemeFormState(): Record<BrandThemeColorKey, string> {
  return {
    brand_primary: "",
    brand_primary_2: "",
    brand_primary_3: "",
    brand_secondary: "",
    brand_success: "",
    brand_success_2: "",
    brand_danger: "",
    brand_danger_2: "",
  };
}

export function mapBrandThemeToFormState(
  settings?: Partial<Record<BrandThemeColorKey, string | null>> | null,
): Record<BrandThemeColorKey, string> {
  return {
    brand_primary: settings?.brand_primary ?? "",
    brand_primary_2: settings?.brand_primary_2 ?? "",
    brand_primary_3: settings?.brand_primary_3 ?? "",
    brand_secondary: settings?.brand_secondary ?? "",
    brand_success: settings?.brand_success ?? "",
    brand_success_2: settings?.brand_success_2 ?? "",
    brand_danger: settings?.brand_danger ?? "",
    brand_danger_2: settings?.brand_danger_2 ?? "",
  };
}

export { DEFAULT_BRAND_THEME };
