"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Truck } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { Toggle } from "../../src/components/ui/toggle";
import {
  useSeoSettings,
  useUpdateSeoSettings,
} from "../../src/services/settings/hooks/use-settings";
import { UpdateSeoSettingsDto } from "../../src/services/settings/types/settings.types";
import type { NullableNumber } from "../../src/lib/nullable-number";

type ShippingFormState = {
  free_delivery_enabled: boolean;
  free_delivery_amount: NullableNumber;
  delivery_fee: NullableNumber;
  shipping_rules_enabled: boolean;
  shipping_cutoff_hour: NullableNumber;
  shipping_rule_1_when_en: string;
  shipping_rule_1_when_ar: string;
  shipping_rule_1_arrives_en: string;
  shipping_rule_1_arrives_ar: string;
  shipping_rule_2_when_en: string;
  shipping_rule_2_when_ar: string;
  shipping_rule_2_arrives_en: string;
  shipping_rule_2_arrives_ar: string;
  shipping_rule_3_when_en: string;
  shipping_rule_3_when_ar: string;
  shipping_rule_3_arrives_en: string;
  shipping_rule_3_arrives_ar: string;
};

const emptyFormState: ShippingFormState = {
  free_delivery_enabled: true,
  free_delivery_amount: null,
  delivery_fee: null,
  shipping_rules_enabled: true,
  shipping_cutoff_hour: 14,
  shipping_rule_1_when_en: "Order by {time} (Sun–Thu)",
  shipping_rule_1_when_ar: "اطلب قبل {time} (الأحد–الخميس)",
  shipping_rule_1_arrives_en: "Arrives tomorrow",
  shipping_rule_1_arrives_ar: "يصل غداً",
  shipping_rule_2_when_en: "Order after {time} (Sun–Wed)",
  shipping_rule_2_when_ar: "اطلب بعد {time} (الأحد–الأربعاء)",
  shipping_rule_2_arrives_en: "Arrives in 2 days",
  shipping_rule_2_arrives_ar: "يصل خلال يومين",
  shipping_rule_3_when_en: "Order Thu after cutoff, Fri, or Sat",
  shipping_rule_3_when_ar: "اطلب بعد الموعد يوم الخميس أو الجمعة أو السبت",
  shipping_rule_3_arrives_en: "Arrives Sunday",
  shipping_rule_3_arrives_ar: "يصل يوم الأحد",
};

const CUTOFF_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period} (Amman)`;
}

function ShippingRuleEditor({
  title,
  description,
  whenEn,
  whenAr,
  arrivesEn,
  arrivesAr,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  whenEn: string;
  whenAr: string;
  arrivesEn: string;
  arrivesAr: string;
  disabled: boolean;
  onChange: (field: "when_en" | "when_ar" | "arrives_en" | "arrives_ar", value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-primary/10 bg-gray-50 p-4">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Input
          label="When (English)"
          value={whenEn}
          onChange={(event) => onChange("when_en", event.target.value)}
          disabled={disabled}
          placeholder="Use {time} for the cutoff clock time"
        />
        <Input
          label="When (Arabic)"
          value={whenAr}
          onChange={(event) => onChange("when_ar", event.target.value)}
          disabled={disabled}
          dir="rtl"
        />
        <Input
          label="Arrives (English)"
          value={arrivesEn}
          onChange={(event) => onChange("arrives_en", event.target.value)}
          disabled={disabled}
        />
        <Input
          label="Arrives (Arabic)"
          value={arrivesAr}
          onChange={(event) => onChange("arrives_ar", event.target.value)}
          disabled={disabled}
          dir="rtl"
        />
      </div>
    </div>
  );
}

export default function ShippingSettingsPage() {
  const { data, isLoading, isError, error, refetch } = useSeoSettings();
  const updateSeoSettings = useUpdateSeoSettings();
  const [formState, setFormState] = useState<ShippingFormState>(emptyFormState);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState({
      free_delivery_enabled: data.free_delivery_enabled ?? true,
      free_delivery_amount: data.free_delivery_amount ?? null,
      delivery_fee: data.delivery_fee ?? null,
      shipping_rules_enabled: data.shipping_rules_enabled ?? true,
      shipping_cutoff_hour: data.shipping_cutoff_hour ?? 14,
      shipping_rule_1_when_en: data.shipping_rule_1_when_en ?? emptyFormState.shipping_rule_1_when_en,
      shipping_rule_1_when_ar: data.shipping_rule_1_when_ar ?? emptyFormState.shipping_rule_1_when_ar,
      shipping_rule_1_arrives_en:
        data.shipping_rule_1_arrives_en ?? emptyFormState.shipping_rule_1_arrives_en,
      shipping_rule_1_arrives_ar:
        data.shipping_rule_1_arrives_ar ?? emptyFormState.shipping_rule_1_arrives_ar,
      shipping_rule_2_when_en: data.shipping_rule_2_when_en ?? emptyFormState.shipping_rule_2_when_en,
      shipping_rule_2_when_ar: data.shipping_rule_2_when_ar ?? emptyFormState.shipping_rule_2_when_ar,
      shipping_rule_2_arrives_en:
        data.shipping_rule_2_arrives_en ?? emptyFormState.shipping_rule_2_arrives_en,
      shipping_rule_2_arrives_ar:
        data.shipping_rule_2_arrives_ar ?? emptyFormState.shipping_rule_2_arrives_ar,
      shipping_rule_3_when_en: data.shipping_rule_3_when_en ?? emptyFormState.shipping_rule_3_when_en,
      shipping_rule_3_when_ar: data.shipping_rule_3_when_ar ?? emptyFormState.shipping_rule_3_when_ar,
      shipping_rule_3_arrives_en:
        data.shipping_rule_3_arrives_en ?? emptyFormState.shipping_rule_3_arrives_en,
      shipping_rule_3_arrives_ar:
        data.shipping_rule_3_arrives_ar ?? emptyFormState.shipping_rule_3_arrives_ar,
    });
  }, [data]);

  const setField = <K extends keyof ShippingFormState>(field: K, value: ShippingFormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const payload: UpdateSeoSettingsDto = {
      free_delivery_enabled: formState.free_delivery_enabled,
      free_delivery_amount: formState.free_delivery_amount,
      delivery_fee: formState.delivery_fee,
      shipping_rules_enabled: formState.shipping_rules_enabled,
      shipping_cutoff_hour: formState.shipping_cutoff_hour,
      shipping_rule_1_when_en: formState.shipping_rule_1_when_en,
      shipping_rule_1_when_ar: formState.shipping_rule_1_when_ar,
      shipping_rule_1_arrives_en: formState.shipping_rule_1_arrives_en,
      shipping_rule_1_arrives_ar: formState.shipping_rule_1_arrives_ar,
      shipping_rule_2_when_en: formState.shipping_rule_2_when_en,
      shipping_rule_2_when_ar: formState.shipping_rule_2_when_ar,
      shipping_rule_2_arrives_en: formState.shipping_rule_2_arrives_en,
      shipping_rule_2_arrives_ar: formState.shipping_rule_2_arrives_ar,
      shipping_rule_3_when_en: formState.shipping_rule_3_when_en,
      shipping_rule_3_when_ar: formState.shipping_rule_3_when_ar,
      shipping_rule_3_arrives_en: formState.shipping_rule_3_arrives_en,
      shipping_rule_3_arrives_ar: formState.shipping_rule_3_arrives_ar,
    };

    await updateSeoSettings.mutateAsync(payload);
  };

  const busy = isLoading || updateSeoSettings.isPending;

  if (isError) {
    return (
      <div className="admin-page">
        <PageHeader
          icon={<Truck />}
          title="Shipping Settings"
          description="Manage delivery fees and shipping arrival rules."
        />
        <SettingsNav />
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold">Error Loading Shipping Settings</h3>
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
    <div className="admin-page">
      <PageHeader
        icon={<Truck />}
        title="Shipping Settings"
        description="Configure delivery fees and the shipping times shown on product pages."
        action={{
          label: updateSeoSettings.isPending ? "Saving..." : "Save Settings",
          onClick: handleSave,
          disabled: busy,
        }}
      />

      <SettingsNav />

      <Card>
        <h2 className="text-lg font-semibold">Delivery Fees</h2>
        <p className="mt-1 text-sm text-gray-500">
          Control the standard delivery fee and free-delivery threshold used on the storefront.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="font-medium">Standard Delivery Fee (JOD)</p>
              <p className="text-sm text-gray-500">
                Applied to orders that do not qualify for free delivery.
              </p>
            </div>
            <div className="w-48">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formState.delivery_fee}
                onNumberChange={(value) => setField("delivery_fee", value)}
                disabled={busy}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="font-medium">Free Delivery Threshold (JOD)</p>
              <p className="text-sm text-gray-500">
                Minimum order amount required to unlock free delivery.
              </p>
            </div>
            <div className="w-48">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formState.free_delivery_amount}
                onNumberChange={(value) => setField("free_delivery_amount", value)}
                disabled={busy || !formState.free_delivery_enabled}
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div>
              <p className="font-medium">Enable Free Delivery</p>
              <p className="text-sm text-gray-500">
                When enabled, orders above the threshold ship for free.
              </p>
            </div>
            <Toggle
              checked={formState.free_delivery_enabled}
              onChange={(value) => setField("free_delivery_enabled", value)}
              disabled={busy}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Shipping Rules</h2>
            <p className="mt-1 text-sm text-gray-500">
              These times and arrival messages appear on every product details page. Use{" "}
              <code className="rounded bg-gray-100 px-1">{"{time}"}</code> to insert the cutoff
              clock time.
            </p>
          </div>
          <Toggle
            checked={formState.shipping_rules_enabled}
            onChange={(value) => setField("shipping_rules_enabled", value)}
            disabled={busy}
          />
        </div>

        <div className="mt-5 max-w-sm">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Daily Cutoff Time
          </label>
          <select
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={formState.shipping_cutoff_hour ?? 14}
            onChange={(event) =>
              setField("shipping_cutoff_hour", Number.parseInt(event.target.value, 10))
            }
            disabled={busy || !formState.shipping_rules_enabled}
          >
            {CUTOFF_HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>
                {formatHourLabel(hour)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-gray-500">
            Orders before this time (Sun–Thu) can still qualify for next-day delivery.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <ShippingRuleEditor
            title="Rule 1 — Before cutoff"
            description="Shown for orders placed before the daily cutoff."
            whenEn={formState.shipping_rule_1_when_en}
            whenAr={formState.shipping_rule_1_when_ar}
            arrivesEn={formState.shipping_rule_1_arrives_en}
            arrivesAr={formState.shipping_rule_1_arrives_ar}
            disabled={busy || !formState.shipping_rules_enabled}
            onChange={(field, value) => {
              const map = {
                when_en: "shipping_rule_1_when_en",
                when_ar: "shipping_rule_1_when_ar",
                arrives_en: "shipping_rule_1_arrives_en",
                arrives_ar: "shipping_rule_1_arrives_ar",
              } as const;
              setField(map[field], value);
            }}
          />

          <ShippingRuleEditor
            title="Rule 2 — After cutoff"
            description="Shown for orders placed after the daily cutoff on Sun–Wed."
            whenEn={formState.shipping_rule_2_when_en}
            whenAr={formState.shipping_rule_2_when_ar}
            arrivesEn={formState.shipping_rule_2_arrives_en}
            arrivesAr={formState.shipping_rule_2_arrives_ar}
            disabled={busy || !formState.shipping_rules_enabled}
            onChange={(field, value) => {
              const map = {
                when_en: "shipping_rule_2_when_en",
                when_ar: "shipping_rule_2_when_ar",
                arrives_en: "shipping_rule_2_arrives_en",
                arrives_ar: "shipping_rule_2_arrives_ar",
              } as const;
              setField(map[field], value);
            }}
          />

          <ShippingRuleEditor
            title="Rule 3 — Weekend / late Thursday"
            description="Shown for Thursday after cutoff, Friday, and Saturday orders."
            whenEn={formState.shipping_rule_3_when_en}
            whenAr={formState.shipping_rule_3_when_ar}
            arrivesEn={formState.shipping_rule_3_arrives_en}
            arrivesAr={formState.shipping_rule_3_arrives_ar}
            disabled={busy || !formState.shipping_rules_enabled}
            onChange={(field, value) => {
              const map = {
                when_en: "shipping_rule_3_when_en",
                when_ar: "shipping_rule_3_when_ar",
                arrives_en: "shipping_rule_3_arrives_en",
                arrives_ar: "shipping_rule_3_arrives_ar",
              } as const;
              setField(map[field], value);
            }}
          />
        </div>
      </Card>
    </div>
  );
}
