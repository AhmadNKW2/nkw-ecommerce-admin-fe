"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Globe2,
  MonitorSmartphone,
  MousePointerClick,
  RefreshCw,
  Route,
  Users,
} from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { useAnalyticsOverview } from "../src/services/analytics/hooks/use-analytics";
import type {
  AnalyticsKpi,
  AnalyticsNamedValue,
  AnalyticsRange,
} from "../src/services/analytics/types/analytics.types";

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "28d", label: "28 days" },
  { value: "90d", label: "90 days" },
  { value: "365d", label: "12 months" },
];

const CHART_COLORS = [
  "var(--color-primary)",
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#be123c",
  "#475569",
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function formatKpiValue(kpi: AnalyticsKpi): string {
  switch (kpi.format) {
    case "percent":
      return formatPercent(kpi.value);
    case "duration":
      return formatDuration(kpi.value);
    case "decimal":
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(kpi.value);
    default:
      return formatNumber(kpi.value);
  }
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ChangeBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent == null) {
    return (
      <span className="text-xs font-medium text-gray-400">New vs prior</span>
    );
  }

  const positive = changePercent >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        positive ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(changePercent).toFixed(1)}%
    </span>
  );
}

function RankedList({
  title,
  icon,
  items,
  valueLabel,
}: {
  title: string;
  icon: ReactNode;
  items: AnalyticsNamedValue[];
  valueLabel: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <Card className="h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-r1 bg-primary/10 text-primary">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{valueLabel}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No data yet</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-sm text-gray-800 truncate" title={item.name}>
                  {item.name}
                </span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                  {formatNumber(item.value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("28d");
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAnalyticsOverview({ range });

  const headlineKpis = useMemo(
    () =>
      (data?.kpis || []).filter((kpi) =>
        [
          "activeUsers",
          "sessions",
          "pageViews",
          "engagementRate",
          "bounceRate",
          "averageSessionDuration",
        ].includes(kpi.key),
      ),
    [data?.kpis],
  );

  const secondaryKpis = useMemo(
    () =>
      (data?.kpis || []).filter((kpi) =>
        ["newUsers", "engagedSessions", "eventCount", "conversions", "totalRevenue"].includes(
          kpi.key,
        ),
      ),
    [data?.kpis],
  );

  const chartData = data?.timeseries || [];
  const deviceData = data?.devices || [];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<BarChart3 className="h-5 w-5 text-white" />}
        title="Google Analytics"
        description={
          data
            ? `${data.range.label} · property ${data.propertyId}`
            : "Live GA4 traffic, engagement, and acquisition"
        }
        extraActions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-r1 border border-primary/15 bg-white p-0.5">
              {RANGES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRange(item.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[calc(var(--radius)-2px)] transition-colors ${
                    range === item.value
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-primary/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-r1 bg-white shadow-s1 animate-pulse"
            />
          ))}
        </div>
      ) : null}

      {isError ? (
        <Card>
          <EmptyState
            icon={<BarChart3 />}
            title="Couldn’t load Google Analytics"
            description={
              error instanceof Error
                ? error.message
                : "Check GA4 credentials and property access, then try again."
            }
          />
          <div className="flex justify-center pb-6">
            <Button onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      {!isLoading && !isError && data ? (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
            {headlineKpis.map((kpi) => (
              <Card key={kpi.key} className="!gap-2">
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-semibold text-gray-900 tracking-tight tabular-nums">
                  {formatKpiValue(kpi)}
                </p>
                <ChangeBadge changePercent={kpi.changePercent} />
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-2 min-h-[360px]">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-r1 bg-primary/10 text-primary">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Traffic over time
                    </h3>
                    <p className="text-xs text-gray-500">
                      Users, sessions, and page views
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-[280px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      labelFormatter={(label) => formatShortDate(String(label))}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="activeUsers"
                      name="Users"
                      stroke="var(--color-primary)"
                      fill="url(#usersFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      name="Sessions"
                      stroke="#0f766e"
                      fill="url(#sessionsFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="pageViews"
                      name="Page views"
                      stroke="#b45309"
                      fill="transparent"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="min-h-[360px]">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-r1 bg-primary/10 text-primary">
                  <MonitorSmartphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Devices</h3>
                  <p className="text-xs text-gray-500">Sessions by device</p>
                </div>
              </div>

              {deviceData.length === 0 ? (
                <p className="text-sm text-gray-500 py-16 text-center">No data yet</p>
              ) : (
                <>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {deviceData.map((_, index) => (
                            <Cell
                              key={index}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatNumber(Number(value))}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2 mt-2">
                    {deviceData.map((item, index) => (
                      <li
                        key={item.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="inline-flex items-center gap-2 text-gray-700 capitalize">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                CHART_COLORS[index % CHART_COLORS.length],
                            }}
                          />
                          {item.name}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatNumber(item.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {secondaryKpis.map((kpi) => (
              <Card key={kpi.key} className="!gap-1.5">
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                <p className="text-xl font-semibold text-gray-900 tabular-nums">
                  {formatKpiValue(kpi)}
                </p>
                <ChangeBadge changePercent={kpi.changePercent} />
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <RankedList
              title="Top pages"
              icon={<Route className="h-4 w-4" />}
              items={data.topPages}
              valueLabel="By page views"
            />
            <RankedList
              title="Traffic sources"
              icon={<Users className="h-4 w-4" />}
              items={data.trafficSources}
              valueLabel="By sessions"
            />
            <RankedList
              title="Countries"
              icon={<Globe2 className="h-4 w-4" />}
              items={data.countries}
              valueLabel="By active users"
            />
          </div>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-r1 bg-primary/10 text-primary">
                <MousePointerClick className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Top events</h3>
                <p className="text-xs text-gray-500">Most fired events in this period</p>
              </div>
            </div>

            {data.events.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No events yet</p>
            ) : (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...data.events].reverse()}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 11, fill: "#374151" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatNumber(Number(value))}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Bar dataKey="value" name="Events" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
