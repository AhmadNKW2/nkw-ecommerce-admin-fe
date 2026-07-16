"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  CalendarRange,
  Globe2,
  MonitorSmartphone,
  MousePointerClick,
  RefreshCw,
  Route,
  Users,
  Pencil,
} from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { IconButton } from "../src/components/ui/icon-button";
import { Modal } from "../src/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import {
  useAnalyticsOverview,
  useAnalyticsVisitor,
  useAnalyticsVisitors,
  useDeleteAnalyticsVisitor,
  useRenameAdminClientDevice,
} from "../src/services/analytics/hooks/use-analytics";
import type {
  AnalyticsKpi,
  AnalyticsNamedValue,
  AnalyticsOverviewParams,
  AnalyticsRange,
  AnalyticsVisitorListItem,
} from "../src/services/analytics/types/analytics.types";
import { PAGINATION } from "../src/lib/constants";

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

type TabKey = "overview" | "visitors" | "admins";

type VisitorSortKey =
  | "lastPath"
  | "sessions"
  | "events"
  | "duration"
  | "firstSeen"
  | "lastSeen"
  | "deviceName"
  | "admin";

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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function shortPath(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    if (value.startsWith("http")) {
      const url = new URL(value);
      return `${url.pathname}${url.search}` || "/";
    }
  } catch {
    // keep raw
  }
  return value.length > 80 ? `${value.slice(0, 80)}…` : value;
}

function eventDisplayName(event: {
  name: string;
  properties: Record<string, unknown> | null;
}): string {
  const searchTerm = event.properties?.search_term;
  if (typeof searchTerm === "string" && searchTerm.trim()) {
    const term = searchTerm.trim();
    if (/^search_submit$/i.test(event.name)) {
      return `Searched: ${term}`;
    }
    if (/^search_suggestion_click$/i.test(event.name)) {
      return `Search suggestion: ${term}`;
    }
    if (!event.name.includes(term)) {
      return `${event.name} — “${term}”`;
    }
  }
  return event.name;
}

const TRAFFIC_LEGEND = [
  { key: "activeUsers", label: "Users", color: "var(--color-primary)" },
  { key: "sessions", label: "Sessions", color: "#0f766e" },
  { key: "pageViews", label: "Page views", color: "#b45309" },
] as const;

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
  const [tab, setTab] = useState<TabKey>("overview");
  const [range, setRange] = useState<AnalyticsRange | "custom">("28d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [visitorPage, setVisitorPage] = useState(PAGINATION.defaultPage);
  const [visitorPageSize, setVisitorPageSize] = useState(PAGINATION.defaultPageSize);
  const [visitorSearch, setVisitorSearch] = useState("");
  const [visitorSortBy, setVisitorSortBy] = useState<VisitorSortKey>("lastSeen");
  const [visitorSortOrder, setVisitorSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedVisitorId, setSelectedVisitorId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [visitorPendingDelete, setVisitorPendingDelete] =
    useState<AnalyticsVisitorListItem | null>(null);
  const [devicePendingRename, setDevicePendingRename] = useState<{
    deviceId: number;
    clientId: number;
    currentName: string;
  } | null>(null);
  const [deviceNameDraft, setDeviceNameDraft] = useState("");

  const overviewParams: AnalyticsOverviewParams = useMemo(() => {
    if (range === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    if (range === "custom") {
      return { range: "28d" };
    }
    return { range };
  }, [range, customStart, customEnd]);

  const visitorDateParams = useMemo(() => {
    if (range === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    if (range !== "custom") {
      const daysByRange: Record<AnalyticsRange, number> = {
        "7d": 7,
        "28d": 28,
        "90d": 90,
        "365d": 365,
      };
      const days = daysByRange[range];
      const end = new Date();
      const start = new Date();
      start.setUTCDate(end.getUTCDate() - (days - 1));
      const toYmd = (d: Date) => d.toISOString().slice(0, 10);
      return { startDate: toYmd(start), endDate: toYmd(end) };
    }
    return {};
  }, [range, customStart, customEnd]);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAnalyticsOverview(overviewParams, { enabled: tab === "overview" });

  const {
    data: visitorsPayload,
    isLoading: visitorsLoading,
    refetch: refetchVisitors,
    isFetching: visitorsFetching,
  } = useAnalyticsVisitors(
    {
      page: visitorPage,
      limit: visitorPageSize,
      search: visitorSearch || undefined,
      audience: tab === "admins" ? "admins" : "visitors",
      sortBy: visitorSortBy,
      sortOrder: visitorSortOrder,
      ...(tab === "admins" ? {} : visitorDateParams),
    },
    { enabled: tab === "visitors" || tab === "admins" },
  );

  const { data: visitorDetail, isLoading: visitorDetailLoading } =
    useAnalyticsVisitor(selectedVisitorId);
  const deleteVisitor = useDeleteAnalyticsVisitor();
  const renameAdminDevice = useRenameAdminClientDevice();

  useEffect(() => {
    if (!visitorDetail?.sessions.length) {
      setSelectedSessionId(null);
      return;
    }
    setSelectedSessionId((current) => {
      if (current != null && visitorDetail.sessions.some((s) => s.id === current)) {
        return current;
      }
      return visitorDetail.sessions[0].id;
    });
  }, [visitorDetail]);

  const selectedSessionEvents = useMemo(() => {
    if (!visitorDetail || selectedSessionId == null) return [];
    return visitorDetail.events.filter((event) => event.sessionId === selectedSessionId);
  }, [visitorDetail, selectedSessionId]);

  const selectedSession = useMemo(() => {
    if (!visitorDetail || selectedSessionId == null) return null;
    return visitorDetail.sessions.find((s) => s.id === selectedSessionId) ?? null;
  }, [visitorDetail, selectedSessionId]);

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
  const visitors = visitorsPayload?.data || [];
  const visitorsMeta = visitorsPayload?.meta || {
    total: 0,
    page: visitorPage,
    limit: visitorPageSize,
    totalPages: 1,
  };
  const isAdminsTab = tab === "admins";
  const isClientsTab = tab === "visitors" || tab === "admins";

  const visitorCurrentSort = {
    key: visitorSortBy,
    order: visitorSortOrder,
  };

  const handleVisitorSort = (key: string) => {
    const sortKey = key as VisitorSortKey;
    if (visitorSortBy === sortKey) {
      setVisitorSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setVisitorSortBy(sortKey);
      setVisitorSortOrder(sortKey === "lastPath" || sortKey === "deviceName" || sortKey === "admin" ? "asc" : "desc");
    }
    setVisitorPage(1);
  };

  const handleConfirmDeleteVisitor = async () => {
    if (!visitorPendingDelete) return;
    try {
      await deleteVisitor.mutateAsync(visitorPendingDelete.id);
      if (selectedVisitorId === visitorPendingDelete.id) {
        setSelectedVisitorId(null);
        setSelectedSessionId(null);
      }
      setVisitorPendingDelete(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmRenameDevice = async () => {
    if (!devicePendingRename) return;
    const name = deviceNameDraft.trim();
    if (!name) return;
    try {
      await renameAdminDevice.mutateAsync({
        deviceId: devicePendingRename.deviceId,
        deviceName: name,
      });
      setDevicePendingRename(null);
      setDeviceNameDraft("");
    } catch (e) {
      console.error(e);
    }
  };

  const description =
    range === "custom" && customStart && customEnd
      ? `${customStart} → ${customEnd}`
      : data
        ? `${data.range.label} · property ${data.propertyId}`
        : "Live GA4 traffic + first-party visitor journeys";

  return (
    <div className="admin-page">
      <PageHeader
        icon={<BarChart3 className="h-5 w-5 text-white" />}
        title="Google Analytics"
        description={description}
        extraActions={
          <div className="flex flex-wrap items-center gap-2 justify-end">
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
              <button
                type="button"
                onClick={() => setRange("custom")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[calc(var(--radius)-2px)] transition-colors inline-flex items-center gap-1 ${
                  range === "custom"
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-primary/5"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                Custom
              </button>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (tab === "overview") refetch();
                else refetchVisitors();
              }}
              disabled={tab === "overview" ? isFetching : visitorsFetching}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  (tab === "overview" ? isFetching : visitorsFetching)
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      {range === "custom" ? (
        <Card className="!gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <Input
                type="date"
                label="From"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setVisitorPage(1);
                }}
              />
            </div>
            <div className="min-w-[160px] flex-1">
              <Input
                type="date"
                label="To"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setVisitorPage(1);
                }}
              />
            </div>
            <p className="text-xs text-gray-500 pb-2">
              Pick both dates to apply a custom range.
            </p>
          </div>
        </Card>
      ) : null}

      <div className="flex rounded-r1 border border-primary/15 bg-white p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`px-4 py-2 text-sm font-semibold rounded-[calc(var(--radius)-2px)] transition-colors ${
            tab === "overview"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-primary/5"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("visitors");
            setVisitorPage(1);
            setVisitorSearch("");
            if (visitorSortBy === "deviceName" || visitorSortBy === "admin") {
              setVisitorSortBy("lastSeen");
              setVisitorSortOrder("desc");
            }
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-[calc(var(--radius)-2px)] transition-colors ${
            tab === "visitors"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-primary/5"
          }`}
        >
          Visitors
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("admins");
            setVisitorPage(1);
            setVisitorSearch("");
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-[calc(var(--radius)-2px)] transition-colors ${
            tab === "admins"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-primary/5"
          }`}
        >
          Admins
        </button>
      </div>

      {tab === "overview" ? (
        <>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-r1 bg-primary/10 text-primary">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Traffic over time
                        </h3>
                        <p className="text-xs text-gray-500">
                          Daily totals from Google Analytics
                        </p>
                      </div>
                    </div>
                    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      {TRAFFIC_LEGEND.map((item) => (
                        <li
                          key={item.key}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="h-[300px] w-full mt-2">
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
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
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
        </>
      ) : isClientsTab ? (
        <Card>
          <div className="rounded-r1 border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-amber-900">
              {isAdminsTab
                ? "Admins = staff browsers on the storefront"
                : "Visitors ≠ Overview (Google Analytics)"}
            </p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {isAdminsTab ? (
                <>
                  Shows every browser registered as an admin device. Admin dashboard and the public
                  site used to keep <strong>separate</strong> Client #s (different domains). They now
                  share one id via cookie on *.ordonsooq.com — refresh admin, then browse the storefront
                  so orders/clicks land on the same Client #. Older orders may still sit under a
                  separate guest Client # in Visitors.
                </>
              ) : (
                <>
                  <strong>Overview</strong> shows historical GA4 totals.
                  <strong> Visitors</strong> only lists non-admin browsers recorded in your own
                  database since first-party tracking started. Admin devices are listed under the
                  Admins tab.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {isAdminsTab ? "Admins" : "Visitors"}
              </h3>
              <p className="text-xs text-gray-500">
                {isAdminsTab
                  ? "Click a row to see that admin client’s journey. Same account can have many client IDs."
                  : "Click a row to see that client’s pages, time on site, and actions (Client #1, #2, …)."}
              </p>
            </div>
            <div className="w-full sm:w-72">
              <Input
                variant="search"
                placeholder={
                  isAdminsTab
                    ? "Search by ID, path, admin email…"
                    : "Search by ID or path…"
                }
                value={visitorSearch}
                onChange={(e) => {
                  setVisitorSearch(e.target.value);
                  setVisitorPage(1);
                }}
              />
            </div>
          </div>

          {visitorsLoading && visitors.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-r1 bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : visitors.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title={isAdminsTab ? "No admin clients yet" : "No visitors yet"}
              description={
                isAdminsTab
                  ? "Same admin can have many Client #s; same Client # can appear for many admins as separate rows."
                  : "Browse the storefront to generate journeys. Each browser becomes Client #1, #2, …"
              }
            />
          ) : (
            <div
              className={
                visitorsFetching && !visitorsLoading
                  ? "opacity-70 transition-opacity"
                  : "opacity-100 transition-opacity"
              }
            >
              <Table
                pagination={{
                  currentPage: visitorsMeta.page,
                  totalPages: visitorsMeta.totalPages,
                  pageSize: visitorsMeta.limit,
                  totalItems: visitorsMeta.total,
                  hasNextPage: visitorsMeta.page < visitorsMeta.totalPages,
                  hasPreviousPage: visitorsMeta.page > 1,
                }}
                onPageChange={setVisitorPage}
                onPageSizeChange={(size) => {
                  setVisitorPageSize(size);
                  setVisitorPage(1);
                }}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    {isAdminsTab ? (
                      <TableHead
                        sortable
                        sortKey="deviceName"
                        currentSort={visitorCurrentSort}
                        onSort={handleVisitorSort}
                      >
                        Device name
                      </TableHead>
                    ) : null}
                    <TableHead>Device</TableHead>
                    {isAdminsTab ? (
                      <TableHead
                        sortable
                        sortKey="admin"
                        currentSort={visitorCurrentSort}
                        onSort={handleVisitorSort}
                      >
                        Admin
                      </TableHead>
                    ) : null}
                    <TableHead
                      sortable
                      sortKey="lastPath"
                      currentSort={visitorCurrentSort}
                      onSort={handleVisitorSort}
                    >
                      Last page
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="sessions"
                      currentSort={visitorCurrentSort}
                      onSort={handleVisitorSort}
                    >
                      Sessions
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="events"
                      currentSort={visitorCurrentSort}
                      onSort={handleVisitorSort}
                    >
                      Events
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="duration"
                      currentSort={visitorCurrentSort}
                      onSort={handleVisitorSort}
                    >
                      Time on site
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="firstSeen"
                      currentSort={visitorCurrentSort}
                      onSort={handleVisitorSort}
                    >
                      First open
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="lastSeen"
                      currentSort={visitorCurrentSort}
                      onSort={handleVisitorSort}
                    >
                      Last seen
                    </TableHead>
                    <TableHead className="w-[96px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((visitor) => (
                    <TableRow
                      key={visitor.rowKey || `v-${visitor.id}`}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() => setSelectedVisitorId(visitor.id)}
                    >
                      <TableCell className="font-semibold text-primary">
                        #{visitor.id}
                        {visitor.userId ? (
                          <span className="ml-2 text-xs font-medium text-gray-500">
                            user {visitor.userId}
                          </span>
                        ) : null}
                      </TableCell>
                      {isAdminsTab ? (
                        <TableCell>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm text-gray-900 truncate">
                              {visitor.admin?.deviceName?.trim() || "Unnamed device"}
                            </span>
                            {visitor.admin?.deviceId ? (
                              <button
                                type="button"
                                className="shrink-0 p-1 rounded-full text-gray-500 hover:bg-primary/10 hover:text-primary"
                                title="Rename device"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDevicePendingRename({
                                    deviceId: visitor.admin!.deviceId!,
                                    clientId: visitor.id,
                                    currentName: visitor.admin?.deviceName || "",
                                  });
                                  setDeviceNameDraft(visitor.admin?.deviceName || "");
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {visitor.admin?.source === "storefront"
                              ? "Storefront"
                              : visitor.admin?.source === "admin_fe"
                                ? "Admin panel"
                                : visitor.admin?.source || ""}
                          </p>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {(() => {
                          const type =
                            (isAdminsTab
                              ? visitor.admin?.deviceType
                              : visitor.deviceType) ||
                            visitor.deviceType ||
                            visitor.admin?.deviceType ||
                            "Unknown";
                          const model =
                            type === "Desktop"
                              ? null
                              : (isAdminsTab
                                  ? visitor.admin?.deviceModel
                                  : visitor.deviceModel) ||
                                visitor.deviceModel ||
                                visitor.admin?.deviceModel ||
                                null;
                          return (
                            <>
                              <span className="text-sm font-medium text-gray-900">
                                {type}
                              </span>
                              {model ? (
                                <p
                                  className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[200px]"
                                  title={model}
                                >
                                  Model: {model}
                                </p>
                              ) : type === "Mobile" || type === "Tablet" ? (
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Model not provided by browser
                                </p>
                              ) : null}
                            </>
                          );
                        })()}
                      </TableCell>
                      {isAdminsTab ? (
                        <TableCell>
                          {visitor.admin ? (
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {visitor.admin.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {visitor.admin.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Admin device</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="max-w-[220px] truncate" title={visitor.lastPath || ""}>
                        {visitor.lastPath || "—"}
                      </TableCell>
                      <TableCell>{visitor.sessionCount}</TableCell>
                      <TableCell>{visitor.eventCount}</TableCell>
                      <TableCell>{formatDuration(visitor.totalDurationSeconds)}</TableCell>
                      <TableCell>{formatDateTime(visitor.firstSeenAt)}</TableCell>
                      <TableCell>{formatDateTime(visitor.lastSeenAt)}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className="inline-flex items-center justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconButton
                            variant="delete"
                            title={`Delete Client #${visitor.id}`}
                            onClick={() => setVisitorPendingDelete(visitor)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      ) : null}

      <Modal
        isOpen={selectedVisitorId != null}
        onClose={() => {
          setSelectedVisitorId(null);
          setSelectedSessionId(null);
        }}
        className="!max-w-4xl w-full"
        contentClassName="!justify-start !items-stretch !p-0 w-full text-left"
      >
        <div className="w-full px-5 pt-5 pb-6 sm:px-6 space-y-5">
          <div className="pr-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Visitor journey
            </p>
            <h2 className="text-xl font-semibold text-gray-900 mt-1">
              Client #{selectedVisitorId}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Summary of this browser on your storefront — how long they stayed, which visits,
              and every recorded action in order.
            </p>
          </div>

          {visitorDetailLoading || !visitorDetail ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-r1 bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-r1 border border-primary/15 bg-primary/5 p-3">
                  <p className="text-xs text-gray-500">Total time on site</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatDuration(visitorDetail.totalDurationSeconds)}
                  </p>
                </div>
                <div className="rounded-r1 border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Visits (sessions)</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {visitorDetail.sessionCount}
                  </p>
                </div>
                <div className="rounded-r1 border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Actions recorded</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {visitorDetail.eventCount}
                  </p>
                </div>
                <div className="rounded-r1 border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Account</p>
                  <p className="text-lg font-semibold">
                    {visitorDetail.admin
                      ? "Admin"
                      : visitorDetail.userId
                        ? `Logged-in #${visitorDetail.userId}`
                        : "Guest"}
                  </p>
                  {visitorDetail.admin ? (
                    <p className="text-xs text-gray-600 mt-1 break-all">
                      {visitorDetail.admin.name} · {visitorDetail.admin.email}
                      {visitorDetail.admin.deviceName
                        ? ` · ${visitorDetail.admin.deviceName}`
                        : ""}
                      {visitorDetail.deviceLabel
                        ? ` · ${visitorDetail.deviceLabel}`
                        : visitorDetail.admin.deviceType
                          ? ` · ${visitorDetail.admin.deviceType}`
                          : ""}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-r1 border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">First open</p>
                  <p className="font-medium">{formatDateTime(visitorDetail.firstSeenAt)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    First time this client opened the site
                  </p>
                </div>
                <div className="rounded-r1 border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">Last seen</p>
                  <p className="font-medium">{formatDateTime(visitorDetail.lastSeenAt)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Last recorded action (matches session activity)
                  </p>
                </div>
                <div className="rounded-r1 border border-gray-100 px-3 py-2 sm:col-span-2">
                  <p className="text-xs text-gray-500">Device</p>
                  <p className="font-medium">
                    {visitorDetail.deviceLabel ||
                      visitorDetail.deviceType ||
                      "Unknown"}
                  </p>
                </div>
                <div className="rounded-r1 border border-gray-100 px-3 py-2 sm:col-span-2">
                  <p className="text-xs text-gray-500">Last page</p>
                  <p className="font-medium break-all">{shortPath(visitorDetail.lastPath)}</p>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Sessions</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Click a session to see only that visit’s actions below.
                </p>
                {visitorDetail.sessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No sessions recorded.</p>
                ) : (
                  <ul className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {visitorDetail.sessions.map((session, index) => {
                      const isSelected = session.id === selectedSessionId;
                      return (
                        <li key={session.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedSessionId(session.id)}
                            className={`w-full text-left rounded-r1 border px-3 py-2.5 text-sm transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-gray-100 hover:border-primary/40 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-gray-900">
                                Session #{session.id}
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                  (Visit {visitorDetail.sessions.length - index})
                                </span>
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDuration(session.durationSeconds)} ·{" "}
                                {session.pageViewCount} page views · {session.eventCount} actions
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 break-all">
                              <span className="text-gray-400">Entered</span>{" "}
                              {shortPath(session.landingPath)}
                              <span className="text-gray-400"> → Left </span>
                              {shortPath(session.exitPath)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {formatDateTime(session.startedAt)} –{" "}
                              {formatDateTime(session.lastSeenAt)}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">What they did</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {selectedSession
                    ? `Actions for Session #${selectedSession.id} only — oldest first.`
                    : "Select a session above to view its actions."}
                </p>
                {selectedSessionId == null ? (
                  <p className="text-sm text-gray-500">Select a session to view actions.</p>
                ) : selectedSessionEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">No actions recorded for this session.</p>
                ) : (
                  <ol className="relative space-y-0 max-h-80 overflow-y-auto pr-1 border-l-2 border-primary/20 ml-2">
                    {selectedSessionEvents.map((event) => (
                      <li key={event.id} className="relative pl-4 py-2.5">
                        <span className="absolute -left-[5px] top-4 h-2 w-2 rounded-full bg-primary" />
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {eventDisplayName(event)}
                          </span>
                          <time className="text-[11px] text-gray-500 tabular-nums">
                            {formatDateTime(event.occurredAt)}
                          </time>
                        </div>
                        {event.path ? (
                          <p className="text-xs text-gray-600 mt-0.5 break-all">
                            Page: {shortPath(event.path)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </Modal>

      <DeleteConfirmationModal
        isOpen={!!visitorPendingDelete}
        onClose={() => setVisitorPendingDelete(null)}
        onConfirm={handleConfirmDeleteVisitor}
        isLoading={deleteVisitor.isPending}
        title="Delete client?"
        itemName={visitorPendingDelete ? `Client #${visitorPendingDelete.id}` : undefined}
        message="This permanently deletes this client’s sessions and events, and unregisters the admin device mark. They will not reappear until that browser browses the storefront again."
      />

      <Modal
        isOpen={!!devicePendingRename}
        onClose={() => {
          setDevicePendingRename(null);
          setDeviceNameDraft("");
        }}
        className="!max-w-md w-full"
        contentClassName="gap-4"
      >
        <div className="w-full space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Name this device</h3>
            <p className="text-sm text-gray-500 mt-1">
              Client #{devicePendingRename?.clientId} — e.g. “Office Chrome” or “Home laptop”.
            </p>
          </div>
          <Input
            label="Device name"
            value={deviceNameDraft}
            onChange={(e) => setDeviceNameDraft(e.target.value)}
            placeholder="Office Chrome"
            maxLength={120}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDevicePendingRename(null);
                setDeviceNameDraft("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleConfirmRenameDevice()}
              disabled={!deviceNameDraft.trim() || renameAdminDevice.isPending}
            >
              {renameAdminDevice.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
