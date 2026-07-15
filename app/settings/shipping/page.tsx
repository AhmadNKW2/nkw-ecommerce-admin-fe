"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, Plus, Trash2, Truck } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { Toggle } from "../../src/components/ui/toggle";
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

const CUTOFF_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

const WEEKDAYS: Array<{ value: number; label: string; short: string }> = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

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
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => {
        const active = selected.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (active) {
                onChange(selected.filter((value) => value !== day.value));
                return;
              }
              onChange([...selected, day.value].sort((a, b) => a - b));
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              active
                ? "bg-primary text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-primary/10 hover:text-primary"
            }`}
            aria-pressed={active}
            title={day.label}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

function ShippingRuleCard({
  index,
  total,
  rule,
  disabled,
  dragHandleProps,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  rule: ShippingDeliveryRule;
  disabled: boolean;
  dragHandleProps?: DragHandleProps;
  onChange: (rule: ShippingDeliveryRule) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="rounded-lg border border-primary/10 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {dragHandleProps ? (
            <DragHandle
              dragHandleProps={dragHandleProps}
              className={disabled ? "pointer-events-none opacity-40" : undefined}
            />
          ) : null}
          <div className="min-w-0">
            <h3 className="font-medium">Rule {index + 1}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Drag to rearrange for viewing only. Order is saved, but does not
              change delivery matching.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            className="h-10 px-3 text-sm"
            aria-label="Move rule up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onMoveDown}
            disabled={disabled || index >= total - 1}
            className="h-10 px-3 text-sm"
            aria-label="Move rule down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
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
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Order days</p>
          <DayPicker
            selected={rule.days}
            disabled={disabled}
            onChange={(days) => onChange({ ...rule, days })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Applies when
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={rule.cutoffMode}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...rule,
                  cutoffMode: event.target.value as ShippingCutoffMode,
                })
              }
            >
              <option value="before">Before cutoff</option>
              <option value="after">After cutoff</option>
              <option value="any">Any time</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Arrival type
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={rule.arrivalMode}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...rule,
                  arrivalMode: event.target.value as ShippingArrivalMode,
                })
              }
            >
              <option value="offset_days">In N calendar days</option>
              <option value="next_weekday">Next weekday</option>
            </select>
          </div>

          {rule.arrivalMode === "offset_days" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Days until arrival
              </label>
              <Input
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
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Arrives on
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={rule.arrivalWeekday ?? 0}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...rule,
                    arrivalWeekday: Number.parseInt(event.target.value, 10),
                  })
                }
              >
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
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

  const moveRule = (ruleId: string, direction: -1 | 1) => {
    setFormState((prev) => {
      const currentIndex = prev.shipping_rules.findIndex((item) => item.id === ruleId);
      if (currentIndex < 0) {
        return prev;
      }
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= prev.shipping_rules.length) {
        return prev;
      }
      const nextRules = [...prev.shipping_rules];
      const [moved] = nextRules.splice(currentIndex, 1);
      nextRules.splice(nextIndex, 0, moved);
      return { ...prev, shipping_rules: nextRules };
    });
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
              No rules are created by default. Drag to sort how rules appear here
              (saved order is display-only). Customers see countdown copy like{" "}
              <span className="font-medium text-gray-700">
                Order in 18h and 5m to get it by Friday 17/07/2026
              </span>
              .
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
            Used by before/after cutoff matching and the live countdown.
          </p>
        </div>

        <div className="mt-5">
          {formState.shipping_rules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
              <p className="text-sm text-gray-600">No shipping rules yet.</p>
              <p className="mt-1 text-xs text-gray-500">
                Add a rule to start showing delivery estimates on product pages.
              </p>
            </div>
          ) : (
            <SortableList
              items={formState.shipping_rules}
              disabled={busy || !formState.shipping_rules_enabled}
              onReorder={reorderRules}
              className="flex flex-col gap-4"
              renderItem={(rule, index, dragHandleProps) => (
                <ShippingRuleCard
                  index={index}
                  total={formState.shipping_rules.length}
                  rule={rule}
                  disabled={busy || !formState.shipping_rules_enabled}
                  dragHandleProps={dragHandleProps}
                  onChange={(next) => updateRule(rule.id, next)}
                  onRemove={() => removeRule(rule.id)}
                  onMoveUp={() => moveRule(rule.id, -1)}
                  onMoveDown={() => moveRule(rule.id, 1)}
                />
              )}
            />
          )}
        </div>

        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={addRule}
            disabled={busy || !formState.shipping_rules_enabled}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add rule
          </Button>
        </div>
      </Card>
    </div>
  );
}
