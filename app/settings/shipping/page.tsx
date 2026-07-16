"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus, Trash2, Truck } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { Toggle } from "../../src/components/ui/toggle";
import { Select } from "../../src/components/ui/select";
import { Checkbox } from "../../src/components/ui/checkbox";
import {
  DragHandle,
  SortableList,
  type DragHandleProps,
} from "../../src/components/ui/sortable-list";
import {
  useSeoSettings,
  useUpdateSeoSettings,
} from "../../src/services/settings/hooks/use-settings";
import type {
  ShippingArrivalMode,
  ShippingCutoffMode,
  ShippingDeliveryRule,
  UpdateSeoSettingsDto,
} from "../../src/services/settings/types/settings.types";
import type { NullableNumber } from "../../src/lib/nullable-number";
import { showErrorToast } from "../../src/lib/toast";

type ShippingFormState = {
  free_delivery_enabled: boolean;
  free_delivery_amount: NullableNumber;
  delivery_fee: NullableNumber;
  shipping_rules_enabled: boolean;
  shipping_cutoff_hour: NullableNumber;
  shipping_rules: ShippingDeliveryRule[];
};

const emptyFormState: ShippingFormState = {
  free_delivery_enabled: true,
  free_delivery_amount: null,
  delivery_fee: null,
  shipping_rules_enabled: false,
  shipping_cutoff_hour: 14,
  shipping_rules: [],
};

const CUTOFF_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: formatHourLabel(hour),
}));

const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const CUTOFF_MODE_OPTIONS = [
  { value: "before", label: "Before cutoff" },
  { value: "after", label: "After cutoff" },
  { value: "any", label: "Any time" },
];

const ARRIVAL_MODE_OPTIONS = [
  { value: "offset_days", label: "In N calendar days" },
  { value: "next_weekday", label: "Next weekday" },
];

const WEEKDAY_OPTIONS = WEEKDAYS.map((day) => ({
  value: String(day.value),
  label: day.label,
}));

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period} (Amman)`;
}

function createEmptyRule(): ShippingDeliveryRule {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    days: [],
    cutoffMode: "before",
    arrivalMode: "offset_days",
    arrivalOffsetDays: 1,
    arrivalWeekday: 0,
  };
}

function normalizeRules(rules: unknown): ShippingDeliveryRule[] {
  if (!Array.isArray(rules)) {
    return [];
  }

  return rules
    .map((rule): ShippingDeliveryRule | null => {
      if (!rule || typeof rule !== "object") {
        return null;
      }

      const record = rule as Record<string, unknown>;
      const days = Array.isArray(record.days)
        ? record.days
            .map((day) => Number(day))
            .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        : [];

      const cutoffMode =
        record.cutoffMode === "after" || record.cutoffMode === "any"
          ? record.cutoffMode
          : "before";
      const arrivalMode =
        record.arrivalMode === "next_weekday" ? "next_weekday" : "offset_days";
      const arrivalOffsetDays = Math.min(
        14,
        Math.max(1, Math.trunc(Number(record.arrivalOffsetDays) || 1)),
      );
      const arrivalWeekday = Math.min(
        6,
        Math.max(0, Math.trunc(Number(record.arrivalWeekday) || 0)),
      );

      return {
        id:
          typeof record.id === "string" && record.id.trim().length > 0
            ? record.id
            : createEmptyRule().id,
        days: [...new Set(days)].sort((a, b) => a - b),
        cutoffMode,
        arrivalMode,
        arrivalOffsetDays,
        arrivalWeekday,
      };
    })
    .filter((rule): rule is ShippingDeliveryRule => rule != null);
}

function DayPicker({
  selected,
  disabled,
  onChange,
}: {
  selected: number[];
  disabled: boolean;
  onChange: (days: number[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {WEEKDAYS.map((day) => {
        const active = selected.includes(day.value);
        return (
          <Checkbox
            key={day.value}
            checked={active}
            disabled={disabled}
            label={day.label}
            onChange={(checked) => {
              if (checked) {
                onChange([...selected, day.value].sort((a, b) => a - b));
                return;
              }
              onChange(selected.filter((value) => value !== day.value));
            }}
          />
        );
      })}
    </div>
  );
}

function ShippingRuleCard({
  index,
  rule,
  disabled,
  dragHandleProps,
  onChange,
  onRemove,
}: {
  index: number;
  rule: ShippingDeliveryRule;
  disabled: boolean;
  dragHandleProps?: DragHandleProps;
  onChange: (rule: ShippingDeliveryRule) => void;
  onRemove: () => void;
}) {
  return (
    <Card variant="nested">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          {dragHandleProps ? (
            <DragHandle
              dragHandleProps={dragHandleProps}
              className={disabled ? "pointer-events-none opacity-40" : undefined}
            />
          ) : null}
          <div className="min-w-0">
            <h3 className="text-base font-semibold">Rule {index + 1}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Drag to rearrange for viewing only. Order is saved, but does not
              change delivery matching.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onRemove}
          disabled={disabled}
          className="h-10 px-3 text-sm text-danger hover:bg-danger/10"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Remove
        </Button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Order days</p>
        <DayPicker
          selected={rule.days}
          disabled={disabled}
          onChange={(days) => onChange({ ...rule, days })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Select
          label="Applies when"
          value={rule.cutoffMode}
          onChange={(value) =>
            onChange({
              ...rule,
              cutoffMode: (Array.isArray(value) ? value[0] : value) as ShippingCutoffMode,
            })
          }
          options={CUTOFF_MODE_OPTIONS}
          search={false}
          disabled={disabled}
        />

        <Select
          label="Arrival type"
          value={rule.arrivalMode}
          onChange={(value) =>
            onChange({
              ...rule,
              arrivalMode: (Array.isArray(value)
                ? value[0]
                : value) as ShippingArrivalMode,
            })
          }
          options={ARRIVAL_MODE_OPTIONS}
          search={false}
          disabled={disabled}
        />

        {rule.arrivalMode === "offset_days" ? (
          <Input
            label="Days until arrival"
            type="number"
            min={1}
            max={14}
            value={rule.arrivalOffsetDays ?? 1}
            onNumberChange={(value) =>
              onChange({
                ...rule,
                arrivalOffsetDays: value == null ? 1 : Math.trunc(value),
              })
            }
            disabled={disabled}
          />
        ) : (
          <Select
            label="Arrives on"
            value={String(rule.arrivalWeekday ?? 0)}
            onChange={(value) =>
              onChange({
                ...rule,
                arrivalWeekday: Number.parseInt(
                  (Array.isArray(value) ? value[0] : value) || "0",
                  10,
                ),
              })
            }
            options={WEEKDAY_OPTIONS}
            search={false}
            disabled={disabled}
          />
        )}
      </div>
    </Card>
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
      shipping_rules_enabled: data.shipping_rules_enabled ?? false,
      shipping_cutoff_hour: data.shipping_cutoff_hour ?? 14,
      shipping_rules: normalizeRules(data.shipping_rules),
    });
  }, [data]);

  const setField = <K extends keyof ShippingFormState>(
    field: K,
    value: ShippingFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const updateRule = (ruleId: string, rule: ShippingDeliveryRule) => {
    setFormState((prev) => ({
      ...prev,
      shipping_rules: prev.shipping_rules.map((item) =>
        item.id === ruleId ? rule : item,
      ),
    }));
  };

  const removeRule = (ruleId: string) => {
    setFormState((prev) => ({
      ...prev,
      shipping_rules: prev.shipping_rules.filter((item) => item.id !== ruleId),
    }));
  };

  const reorderRules = (rules: ShippingDeliveryRule[]) => {
    setField("shipping_rules", rules);
  };

  const addRule = () => {
    setFormState((prev) => ({
      ...prev,
      shipping_rules: [...prev.shipping_rules, createEmptyRule()],
    }));
  };

  const handleSave = async () => {
    const invalidRule = formState.shipping_rules.find((rule) => rule.days.length === 0);
    if (invalidRule) {
      showErrorToast("Each shipping rule must include at least one order day.");
      return;
    }

    const payload: UpdateSeoSettingsDto = {
      free_delivery_enabled: formState.free_delivery_enabled,
      free_delivery_amount: formState.free_delivery_amount,
      delivery_fee: formState.delivery_fee,
      shipping_rules_enabled: formState.shipping_rules_enabled,
      shipping_cutoff_hour: formState.shipping_cutoff_hour,
      shipping_rules: formState.shipping_rules.map((rule) => ({
        id: rule.id,
        days: rule.days,
        cutoffMode: rule.cutoffMode,
        arrivalMode: rule.arrivalMode,
        arrivalOffsetDays:
          rule.arrivalMode === "offset_days" ? (rule.arrivalOffsetDays ?? 1) : undefined,
        arrivalWeekday:
          rule.arrivalMode === "next_weekday" ? (rule.arrivalWeekday ?? 0) : undefined,
      })),
    };

    await updateSeoSettings.mutateAsync(payload);
  };

  const busy = isLoading || updateSeoSettings.isPending;
  const rulesDisabled = busy || !formState.shipping_rules_enabled;

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
            <p className="mt-2 mx-auto max-w-md">
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
        description="Configure delivery fees and dynamic shipping rules shown on product pages."
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
          Control the standard delivery fee and free-delivery threshold used on the
          storefront.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Input
            label="Standard Delivery Fee (JOD)"
            type="number"
            min={0}
            step={0.01}
            value={formState.delivery_fee}
            onNumberChange={(value) => setField("delivery_fee", value)}
            disabled={busy}
          />
          <Input
            label="Free Delivery Threshold (JOD)"
            type="number"
            min={0}
            step={0.01}
            value={formState.free_delivery_amount}
            onNumberChange={(value) => setField("free_delivery_amount", value)}
            disabled={busy || !formState.free_delivery_enabled}
          />
        </div>

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
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-r1 bg-primary p-3 text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Shipping Rules</h2>
              <p className="mt-1 text-sm text-gray-500">
                No rules are created by default. Drag to sort how rules appear here
                (saved order is display-only). Customers see countdown copy like{" "}
                <span className="font-medium text-gray-700">
                  Order in 18h and 5m to get it by Friday 17/07/2026
                </span>
                .
              </p>
            </div>
          </div>
          <Toggle
            checked={formState.shipping_rules_enabled}
            onChange={(value) => setField("shipping_rules_enabled", value)}
            disabled={busy}
            label="Enabled"
          />
        </div>

        <div className="max-w-sm">
          <Select
            label="Daily Cutoff Time"
            value={String(formState.shipping_cutoff_hour ?? 14)}
            onChange={(value) =>
              setField(
                "shipping_cutoff_hour",
                Number.parseInt((Array.isArray(value) ? value[0] : value) || "14", 10),
              )
            }
            options={CUTOFF_HOUR_OPTIONS}
            search={false}
            disabled={rulesDisabled}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Used by before/after cutoff matching and the live countdown.
          </p>
        </div>

        {formState.shipping_rules.length === 0 ? (
          <div className="rounded-r1 border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            No shipping rules yet. Add a rule to start showing delivery estimates on
            product pages.
          </div>
        ) : (
          <SortableList
            items={formState.shipping_rules}
            disabled={rulesDisabled}
            onReorder={reorderRules}
            className="flex flex-col gap-4"
            renderItem={(rule, index, dragHandleProps) => (
              <ShippingRuleCard
                index={index}
                rule={rule}
                disabled={rulesDisabled}
                dragHandleProps={dragHandleProps}
                onChange={(next) => updateRule(rule.id, next)}
                onRemove={() => removeRule(rule.id)}
              />
            )}
          />
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            onClick={addRule}
            disabled={rulesDisabled}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </Card>
    </div>
  );
}
