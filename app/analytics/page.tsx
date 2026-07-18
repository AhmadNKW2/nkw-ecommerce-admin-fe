"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Package,
  RefreshCw,
  Route,
  Search,
  ShoppingCart,
  Users,
  Pencil,
  FileText,
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
  useAnalyticsDateCoverage,
  useAnalyticsFooterPageViews,
  useAnalyticsFunnelSessions,
  useAnalyticsOverview,
  useAnalyticsPopularProducts,
  useAnalyticsSearchQueries,
  useAnalyticsVisitor,
  useAnalyticsVisitors,
  useDeleteAnalyticsVisitor,
  useRenameAdminClientDevice,
} from "../src/services/analytics/hooks/use-analytics";
import type {
  AnalyticsDateCoverageScope,
  AnalyticsFooterPageViewsMeta,
  AnalyticsFunnelSessionsMeta,
  AnalyticsKpi,
  AnalyticsNamedValue,
  AnalyticsOverviewParams,
  AnalyticsPopularProductsMeta,
  AnalyticsRange,
  AnalyticsSearchQueriesMeta,
  AnalyticsVisitorListItem,
} from "../src/services/analytics/types/analytics.types";
import { PAGINATION } from "../src/lib/constants";

const FALLBACK_RANGES: Array<{ key: AnalyticsRange; label: string; days: number }> = [
  { key: "1d", label: "Today", days: 1 },
  { key: "2d", label: "2 days", days: 2 },
  { key: "3d", label: "3 days", days: 3 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "28d", label: "28 days", days: 28 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "365d", label: "12 months", days: 365 },
];

const CHART_COLORS = [
  "var(--color-primary)",
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#be123c",
  "#475569",
];

type TabKey = "overview" | "products" | "search" | "visitors" | "admins";
type VisitorViewKey = "general" | "add_to_cart" | "checkout" | "other_pages";
type FunnelSortKey = "startedAt" | "lastSeen" | "events" | "clientId";
type FooterPageSortKey = "occurredAt" | "clientId" | "pageName";

const TAB_KEYS: TabKey[] = ["overview", "products", "search", "visitors", "admins"];
const VISITOR_VIEW_KEYS: VisitorViewKey[] = [
  "general",
  "add_to_cart",
  "checkout",
  "other_pages",
];

type VisitorSortKey =
  | "lastPath"
  | "sessions"
  | "events"
  | "duration"
  | "firstSeen"
  | "lastSeen"
  | "deviceName"
  | "admin";

type ProductSortKey = "views" | "sessions" | "clientIds" | "clicks";
type SearchSortKey = "views" | "sessions" | "clientIds";

function parseTab(value: string | null): TabKey {
  return TAB_KEYS.includes(value as TabKey) ? (value as TabKey) : "overview";
}

function parseVisitorView(value: string | null): VisitorViewKey {
  return VISITOR_VIEW_KEYS.includes(value as VisitorViewKey)
    ? (value as VisitorViewKey)
    : "general";
}

function tabCoverageScope(tab: TabKey): AnalyticsDateCoverageScope {
  if (tab === "products") return "products";
  if (tab === "search") return "search";
  if (tab === "visitors") return "visitors";
  if (tab === "admins") return "admins";
  return "overview";
}

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
  const productName = event.properties?.product_name;
  if (typeof productName === "string" && productName.trim()) {
    if (/^product_card_click$/i.test(event.name)) {
      return `Product card: ${productName.trim()}`;
    }
    if (/^cart_product_click$/i.test(event.name)) {
      return `Cart product: ${productName.trim()}`;
    }
    if (/^product_option_chip_click$/i.test(event.name)) {
      return `Option chip: ${productName.trim()}`;
    }
    if (/^search_suggestion_click$/i.test(event.name)) {
      return `Search suggestion: ${productName.trim()}`;
    }
  }

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const visitorView =
    tab === "visitors" ? parseVisitorView(searchParams.get("visitorView")) : "general";

  const replaceAnalyticsQuery = useCallback(
    (patch: { tab?: TabKey; visitorView?: VisitorViewKey | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextTab = patch.tab ?? parseTab(params.get("tab"));
      params.set("tab", nextTab);
      if (nextTab === "visitors") {
        const nextView =
          patch.visitorView === null
            ? "general"
            : patch.visitorView ?? parseVisitorView(params.get("visitorView"));
        if (nextView === "general") params.delete("visitorView");
        else params.set("visitorView", nextView);
      } else {
        params.delete("visitorView");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setTab = useCallback(
    (next: TabKey) => {
      replaceAnalyticsQuery({
        tab: next,
        visitorView: next === "visitors" ? visitorView : null,
      });
    },
    [replaceAnalyticsQuery, visitorView],
  );

  const setVisitorView = useCallback(
    (next: VisitorViewKey) => {
      replaceAnalyticsQuery({ tab: "visitors", visitorView: next });
    },
    [replaceAnalyticsQuery],
  );

  const [range, setRange] = useState<AnalyticsRange | "custom">("28d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [visitorPage, setVisitorPage] = useState<number>(PAGINATION.defaultPage);
  const [visitorPageSize, setVisitorPageSize] = useState<number>(PAGINATION.defaultPageSize);
  const [visitorSearch, setVisitorSearch] = useState("");
  const [visitorSortBy, setVisitorSortBy] = useState<VisitorSortKey>("lastSeen");
  const [visitorSortOrder, setVisitorSortOrder] = useState<"asc" | "desc">("desc");
  const [funnelSortBy, setFunnelSortBy] = useState<FunnelSortKey>("lastSeen");
  const [funnelSortOrder, setFunnelSortOrder] = useState<"asc" | "desc">("desc");
  const [footerPageSortBy, setFooterPageSortBy] =
    useState<FooterPageSortKey>("occurredAt");
  const [footerPageSortOrder, setFooterPageSortOrder] = useState<"asc" | "desc">(
    "desc",
  );
  const [productPage, setProductPage] = useState<number>(PAGINATION.defaultPage);
  const [productPageSize, setProductPageSize] = useState<number>(PAGINATION.defaultPageSize);
  const [productSearch, setProductSearch] = useState("");
  const [productSortBy, setProductSortBy] = useState<ProductSortKey>("views");
  const [productSortOrder, setProductSortOrder] = useState<"asc" | "desc">("desc");
  const [searchPage, setSearchPage] = useState<number>(PAGINATION.defaultPage);
  const [searchPageSize, setSearchPageSize] = useState<number>(PAGINATION.defaultPageSize);
  const [searchSearch, setSearchSearch] = useState("");
  const [searchSortBy, setSearchSortBy] = useState<SearchSortKey>("views");
  const [searchSortOrder, setSearchSortOrder] = useState<"asc" | "desc">("desc");
  const [includeAdminTraffic, setIncludeAdminTraffic] = useState(false);
  const [rangeAutoApplied, setRangeAutoApplied] = useState(false);
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
  const isFunnelVisitorView =
    tab === "visitors" && (visitorView === "add_to_cart" || visitorView === "checkout");
  const isOtherPagesVisitorView =
    tab === "visitors" && visitorView === "other_pages";
  const funnelKind =
    visitorView === "checkout" ? ("checkout" as const) : ("add_to_cart" as const);

  const overviewParams: AnalyticsOverviewParams = useMemo(() => {
    if (range === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    if (range === "custom") {
      return { range: "28d" };
    }
    return { range };
  }, [range, customStart, customEnd]);

  const coverageScope = tabCoverageScope(tab);
  const { data: dateCoverage } = useAnalyticsDateCoverage(coverageScope);

  const adminToggleLocked = tab === "visitors" || tab === "admins";
  const effectiveIncludeAdmin =
    tab === "admins" ? true : tab === "visitors" ? false : includeAdminTraffic;

  useEffect(() => {
    if (tab === "visitors" && includeAdminTraffic) {
      setIncludeAdminTraffic(false);
    }
    if (tab === "admins" && !includeAdminTraffic) {
      setIncludeAdminTraffic(true);
    }
  }, [tab, includeAdminTraffic]);

  const availableRangePills = useMemo(() => {
    if (dateCoverage?.pills?.length) {
      return dateCoverage.pills.map((pill) => ({
        value: pill.key,
        label: pill.label,
        days: pill.days,
      }));
    }
    // While coverage loads / empty: only show the shortest pill (never invent 28d/90d).
    return FALLBACK_RANGES.filter((pill) => pill.key === "1d").map((pill) => ({
      value: pill.key,
      label: pill.label,
      days: pill.days,
    }));
  }, [dateCoverage]);

  useEffect(() => {
    if (range === "custom") return;
    if (!dateCoverage?.pills?.length) return;
    const keys = new Set(dateCoverage.pills.map((p) => p.key));
    if (keys.has(range as AnalyticsRange)) {
      setRangeAutoApplied(false);
      return;
    }
    const next = dateCoverage.suggested || dateCoverage.pills[0]?.key;
    if (next && next !== range) {
      setRange(next);
      setRangeAutoApplied(true);
      setProductPage(1);
      setSearchPage(1);
      setVisitorPage(1);
    }
  }, [dateCoverage, range, tab]);

  const visitorDateParams = useMemo(() => {
    if (range === "custom" && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    if (range !== "custom") {
      const daysByRange: Record<string, number> = Object.fromEntries(
        FALLBACK_RANGES.map((item) => [item.key, item.days]),
      );
      const days = daysByRange[range] || 28;
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
      ...visitorDateParams,
    },
    {
      enabled:
        tab === "admins" || (tab === "visitors" && visitorView === "general"),
    },
  );

  const {
    data: funnelPayload,
    isLoading: funnelLoading,
    refetch: refetchFunnel,
    isFetching: funnelFetching,
  } = useAnalyticsFunnelSessions(
    {
      kind: funnelKind,
      page: visitorPage,
      limit: visitorPageSize,
      search: visitorSearch || undefined,
      includeAdmin: 0,
      sortBy: funnelSortBy,
      sortOrder: funnelSortOrder,
      ...visitorDateParams,
    },
    { enabled: isFunnelVisitorView },
  );

  const {
    data: footerPagesPayload,
    isLoading: footerPagesLoading,
    refetch: refetchFooterPages,
    isFetching: footerPagesFetching,
  } = useAnalyticsFooterPageViews(
    {
      page: visitorPage,
      limit: visitorPageSize,
      search: visitorSearch || undefined,
      includeAdmin: 0,
      sortBy: footerPageSortBy,
      sortOrder: footerPageSortOrder,
      ...visitorDateParams,
    },
    { enabled: isOtherPagesVisitorView },
  );

  const {
    data: productsPayload,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isFetching: productsFetching,
  } = useAnalyticsPopularProducts(
    {
      page: productPage,
      limit: productPageSize,
      search: productSearch || undefined,
      includeAdmin: effectiveIncludeAdmin ? 1 : 0,
      sortBy: productSortBy,
      sortOrder: productSortOrder,
      ...visitorDateParams,
    },
    { enabled: tab === "products" || tab === "overview" },
  );

  const {
    data: searchPayload,
    isLoading: searchLoading,
    refetch: refetchSearch,
    isFetching: searchFetching,
  } = useAnalyticsSearchQueries(
    {
      page: searchPage,
      limit: searchPageSize,
      search: searchSearch || undefined,
      includeAdmin: effectiveIncludeAdmin ? 1 : 0,
      sortBy: searchSortBy,
      sortOrder: searchSortOrder,
      ...visitorDateParams,
    },
    { enabled: tab === "search" },
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
  const funnelSessions = funnelPayload?.data || [];
  const funnelMeta: AnalyticsFunnelSessionsMeta = funnelPayload?.meta || {
    total: 0,
    page: visitorPage,
    limit: visitorPageSize,
    totalPages: 1,
    kind: funnelKind,
  };
  const footerPageViews = footerPagesPayload?.data || [];
  const footerPagesMeta: AnalyticsFooterPageViewsMeta = footerPagesPayload?.meta || {
    total: 0,
    page: visitorPage,
    limit: visitorPageSize,
    totalPages: 1,
  };
  const popularProducts = productsPayload?.data || [];
  const productsMeta: AnalyticsPopularProductsMeta = productsPayload?.meta || {
    total: 0,
    page: productPage,
    limit: productPageSize,
    totalPages: 1,
  };
  const searchQueries = searchPayload?.data || [];
  const searchMeta: AnalyticsSearchQueriesMeta = searchPayload?.meta || {
    total: 0,
    page: searchPage,
    limit: searchPageSize,
    totalPages: 1,
  };
  const isAdminsTab = tab === "admins";
  const isClientsTab = tab === "visitors" || tab === "admins";
  const productAdminContribution = productsMeta.adminContribution;
  const productToggleHasEffect = Boolean(productsMeta.toggleHasEffect);
  const productViewsSource = productsMeta.viewsSource || "first_party";
  const searchAdminContribution = searchMeta.adminContribution;
  const searchToggleHasEffect = Boolean(searchMeta.toggleHasEffect);

  const visitorCurrentSort = {
    key: visitorSortBy,
    order: visitorSortOrder,
  };

  const funnelCurrentSort = {
    key: funnelSortBy,
    order: funnelSortOrder,
  };

  const footerPageCurrentSort = {
    key: footerPageSortBy,
    order: footerPageSortOrder,
  };

  const productCurrentSort = {
    key: productSortBy,
    order: productSortOrder,
  };

  const searchCurrentSort = {
    key: searchSortBy,
    order: searchSortOrder,
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

  const handleFunnelSort = (key: string) => {
    const sortKey = key as FunnelSortKey;
    if (funnelSortBy === sortKey) {
      setFunnelSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setFunnelSortBy(sortKey);
      setFunnelSortOrder("desc");
    }
    setVisitorPage(1);
  };

  const handleFooterPageSort = (key: string) => {
    const sortKey = key as FooterPageSortKey;
    if (footerPageSortBy === sortKey) {
      setFooterPageSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setFooterPageSortBy(sortKey);
      setFooterPageSortOrder(sortKey === "pageName" ? "asc" : "desc");
    }
    setVisitorPage(1);
  };

  const handleProductSort = (key: string) => {
    const sortKey = key as ProductSortKey;
    if (productSortBy === sortKey) {
      setProductSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setProductSortBy(sortKey);
      setProductSortOrder("desc");
    }
    setProductPage(1);
  };

  const handleSearchSort = (key: string) => {
    const sortKey = key as SearchSortKey;
    if (searchSortBy === sortKey) {
      setSearchSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSearchSortBy(sortKey);
      setSearchSortOrder("desc");
    }
    setSearchPage(1);
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
            <div
              className={`flex rounded-r1 border border-primary/15 bg-white p-0.5 ${
                adminToggleLocked ? "opacity-70" : ""
              }`}
              title={
                tab === "visitors"
                  ? "Visitors is always without admin"
                  : tab === "admins"
                    ? "Admins is always admin devices only"
                    : undefined
              }
            >
              <button
                type="button"
                disabled={adminToggleLocked}
                onClick={() => {
                  setIncludeAdminTraffic(false);
                  setProductPage(1);
                  setSearchPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[calc(var(--radius)-2px)] transition-colors disabled:cursor-not-allowed ${
                  !effectiveIncludeAdmin
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-primary/5"
                }`}
              >
                Without admin
              </button>
              <button
                type="button"
                disabled={adminToggleLocked}
                onClick={() => {
                  setIncludeAdminTraffic(true);
                  setProductPage(1);
                  setSearchPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[calc(var(--radius)-2px)] transition-colors disabled:cursor-not-allowed ${
                  effectiveIncludeAdmin
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-primary/5"
                }`}
              >
                With admin
              </button>
            </div>
            <div className="flex rounded-r1 border border-primary/15 bg-white p-0.5">
              {availableRangePills.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setRange(item.value);
                    setRangeAutoApplied(false);
                    setProductPage(1);
                    setSearchPage(1);
                    setVisitorPage(1);
                  }}
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
                onClick={() => {
                  setRange("custom");
                  setRangeAutoApplied(false);
                }}
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
                if (tab === "overview") {
                  refetch();
                  refetchProducts();
                } else if (tab === "products") refetchProducts();
                else if (tab === "search") refetchSearch();
                else if (isFunnelVisitorView) refetchFunnel();
                else if (isOtherPagesVisitorView) refetchFooterPages();
                else refetchVisitors();
              }}
              disabled={
                tab === "overview"
                  ? isFetching || productsFetching
                  : tab === "products"
                    ? productsFetching
                    : tab === "search"
                      ? searchFetching
                      : isFunnelVisitorView
                        ? funnelFetching
                        : isOtherPagesVisitorView
                          ? footerPagesFetching
                          : visitorsFetching
              }
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  (
                    tab === "overview"
                      ? isFetching || productsFetching
                      : tab === "products"
                        ? productsFetching
                        : tab === "search"
                          ? searchFetching
                          : isFunnelVisitorView
                            ? funnelFetching
                            : isOtherPagesVisitorView
                              ? footerPagesFetching
                              : visitorsFetching
                  )
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      {rangeAutoApplied && range !== "custom" ? (
        <div className="rounded-r1 border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          No data for the previous date range on this tab — switched to{" "}
          <strong>
            {availableRangePills.find((p) => p.value === range)?.label || range}
          </strong>
          . Empty longer ranges are hidden.
        </div>
      ) : null}

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
                  setProductPage(1);
                  setSearchPage(1);
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
                  setProductPage(1);
                  setSearchPage(1);
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
            setTab("products");
            setProductPage(1);
            setRangeAutoApplied(false);
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-[calc(var(--radius)-2px)] transition-colors ${
            tab === "products"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-primary/5"
          }`}
        >
          Products
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("search");
            setSearchPage(1);
            setRangeAutoApplied(false);
          }}
          className={`px-4 py-2 text-sm font-semibold rounded-[calc(var(--radius)-2px)] transition-colors ${
            tab === "search"
              ? "bg-primary text-white"
              : "text-gray-600 hover:bg-primary/5"
          }`}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("visitors");
            setVisitorPage(1);
            setVisitorSearch("");
            setRangeAutoApplied(false);
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

              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-r1 bg-primary/10 text-primary">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Most popular products
                      </h3>
                      <p className="text-xs text-gray-500">
                        Views / sessions / client IDs / card clicks ·{" "}
                        {effectiveIncludeAdmin ? "with admin" : "without admin"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setTab("products");
                      setProductPage(1);
                    }}
                  >
                    View all
                  </Button>
                </div>

                {productsLoading && popularProducts.length === 0 ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-10 rounded-r1 bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                ) : popularProducts.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">
                    No product traffic in this range yet
                  </p>
                ) : (
                  <div
                    className={
                      productsFetching && !productsLoading
                        ? "opacity-70 transition-opacity"
                        : "opacity-100 transition-opacity"
                    }
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead
                            sortable
                            sortKey="views"
                            currentSort={productCurrentSort}
                            onSort={handleProductSort}
                          >
                            Views
                          </TableHead>
                          <TableHead
                            sortable
                            sortKey="sessions"
                            currentSort={productCurrentSort}
                            onSort={handleProductSort}
                          >
                            Sessions
                          </TableHead>
                          <TableHead
                            sortable
                            sortKey="clientIds"
                            currentSort={productCurrentSort}
                            onSort={handleProductSort}
                          >
                            Client IDs
                          </TableHead>
                          <TableHead
                            sortable
                            sortKey="clicks"
                            currentSort={productCurrentSort}
                            onSort={handleProductSort}
                          >
                            Card clicks
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {popularProducts.slice(0, 10).map((item) => (
                          <TableRow
                            key={`overview-${item.productId ?? "slug"}-${item.slug ?? item.name}`}
                          >
                            <TableCell>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {item.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {item.productId != null ? `#${item.productId}` : "—"}
                                  {item.slug ? ` · ${item.slug}` : ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="tabular-nums font-medium">
                              {formatNumber(item.views)}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {formatNumber(item.sessions)}
                            </TableCell>
                            <TableCell className="tabular-nums font-medium">
                              {formatNumber(item.clientIds)}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {formatNumber(item.clicks)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </>
          ) : null}
        </>
      ) : tab === "products" ? (
        <Card>
          <div className="rounded-r1 border border-sky-200 bg-sky-50 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-sky-900">
              Most popular products
            </p>
            <p className="text-xs text-sky-800 mt-1 leading-relaxed">
              <strong>Views</strong> and <strong>sessions</strong> are product page opens.
              <strong> Client IDs</strong> = distinct browsers that viewed the product.
              <strong> Card clicks</strong> = listing card taps (<code>product_card_click</code>),
              not GA clicks. All respect the admin toggle.
            </p>
          </div>

          <div
            className={`rounded-r1 border px-4 py-3 mb-4 ${
              productToggleHasEffect
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p
              className={`text-xs leading-relaxed ${
                productToggleHasEffect ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {productToggleHasEffect ? (
                <>
                  Admin product traffic in this range:{" "}
                  <strong>{formatNumber(productAdminContribution?.adminViews || 0)}</strong> DB
                  views,{" "}
                  <strong>{formatNumber(productAdminContribution?.adminClicks || 0)}</strong>{" "}
                  clicks from{" "}
                  <strong>{formatNumber(productAdminContribution?.adminDevices || 0)}</strong>{" "}
                  admin device(s). Toggle With/Without admin — totals and rows should change.
                </>
              ) : (
                <>
                  With admin and Without admin look the same because{" "}
                  <strong>no admin-marked browser</strong> viewed or clicked products in this range.
                  Log into admin, then browse products on the storefront with the same browser
                  (shared Client #), then refresh.
                </>
              )}
            </p>
          </div>

          {productsMeta.totals ? (
            <p className="text-xs text-gray-500 mb-3">
              Current filter totals:{" "}
              <strong>{formatNumber(productsMeta.totals.views)}</strong> views ·{" "}
              <strong>{formatNumber(productsMeta.totals.sessions)}</strong> sessions ·{" "}
              <strong>{formatNumber(productsMeta.totals.clicks)}</strong> clicks ·
              includeAdmin=
              {String(productsMeta.includeAdmin)}
            </p>
          ) : null}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Popular products</h3>
              <p className="text-xs text-gray-500">
                Sort by views, sessions, client IDs, or card clicks. Admin filter uses the header toggle.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Input
                variant="search"
                placeholder="Search product name or slug…"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductPage(1);
                }}
              />
            </div>
          </div>

          {productsLoading && popularProducts.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-r1 bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : popularProducts.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No product traffic yet"
              description="Open product pages or click product cards on the storefront to populate this list."
            />
          ) : (
            <div
              className={
                productsFetching && !productsLoading
                  ? "opacity-70 transition-opacity"
                  : "opacity-100 transition-opacity"
              }
            >
              <Table
                pagination={{
                  currentPage: productsMeta.page,
                  totalPages: productsMeta.totalPages,
                  pageSize: productsMeta.limit,
                  totalItems: productsMeta.total,
                  hasNextPage: productsMeta.page < productsMeta.totalPages,
                  hasPreviousPage: productsMeta.page > 1,
                }}
                onPageChange={setProductPage}
                onPageSizeChange={(size) => {
                  setProductPageSize(size);
                  setProductPage(1);
                }}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead
                      sortable
                      sortKey="views"
                      currentSort={productCurrentSort}
                      onSort={handleProductSort}
                    >
                      Views
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="sessions"
                      currentSort={productCurrentSort}
                      onSort={handleProductSort}
                    >
                      Sessions
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="clientIds"
                      currentSort={productCurrentSort}
                      onSort={handleProductSort}
                    >
                      Client IDs
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="clicks"
                      currentSort={productCurrentSort}
                      onSort={handleProductSort}
                    >
                      Card clicks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularProducts.map((item) => (
                    <TableRow
                      key={`${item.productId ?? "slug"}-${item.slug ?? item.name}`}
                    >
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {item.productId != null ? `#${item.productId}` : "—"}
                            {item.slug ? ` · ${item.slug}` : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatNumber(item.views)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatNumber(item.sessions)}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatNumber(item.clientIds)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatNumber(item.clicks)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      ) : tab === "search" ? (
        <Card>
          <div className="rounded-r1 border border-sky-200 bg-sky-50 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-sky-900">Most searched queries</p>
            <p className="text-xs text-sky-800 mt-1 leading-relaxed">
              Built from first-party <strong>Searched:</strong> events. Sort by searches (views),
              sessions, or unique Client IDs. Admin toggle excludes staff browsers marked in the
              Admins tab.
            </p>
          </div>

          <div
            className={`rounded-r1 border px-4 py-3 mb-4 ${
              searchToggleHasEffect
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p
              className={`text-xs leading-relaxed ${
                searchToggleHasEffect ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {searchToggleHasEffect ? (
                <>
                  Admin search traffic in this range:{" "}
                  <strong>{formatNumber(searchAdminContribution?.adminSearches || 0)}</strong>{" "}
                  searches from{" "}
                  <strong>{formatNumber(searchAdminContribution?.adminDevices || 0)}</strong> admin
                  device(s). Toggle With/Without admin to include or exclude them.
                </>
              ) : (
                <>
                  With admin and Without admin look the same because no admin-marked browser searched
                  in this range yet.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Search queries</h3>
              <p className="text-xs text-gray-500">
                {includeAdminTraffic ? "Including admin traffic" : "Excluding admin traffic"}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Input
                variant="search"
                placeholder="Filter queries…"
                value={searchSearch}
                onChange={(e) => {
                  setSearchSearch(e.target.value);
                  setSearchPage(1);
                }}
              />
            </div>
          </div>

          {searchLoading && searchQueries.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 rounded-r1 bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : searchQueries.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="No searches yet"
              description="Submit searches from the storefront search bar to populate this list."
            />
          ) : (
            <div
              className={
                searchFetching && !searchLoading
                  ? "opacity-70 transition-opacity"
                  : "opacity-100 transition-opacity"
              }
            >
              <Table
                pagination={{
                  currentPage: searchMeta.page,
                  totalPages: searchMeta.totalPages,
                  pageSize: searchMeta.limit,
                  totalItems: searchMeta.total,
                  hasNextPage: searchMeta.page < searchMeta.totalPages,
                  hasPreviousPage: searchMeta.page > 1,
                }}
                onPageChange={setSearchPage}
                onPageSizeChange={(size) => {
                  setSearchPageSize(size);
                  setSearchPage(1);
                }}
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead
                      sortable
                      sortKey="views"
                      currentSort={searchCurrentSort}
                      onSort={handleSearchSort}
                    >
                      Searches
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="sessions"
                      currentSort={searchCurrentSort}
                      onSort={handleSearchSort}
                    >
                      Sessions
                    </TableHead>
                    <TableHead
                      sortable
                      sortKey="clientIds"
                      currentSort={searchCurrentSort}
                      onSort={handleSearchSort}
                    >
                      Client IDs
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchQueries.map((item) => (
                    <TableRow key={item.query}>
                      <TableCell>
                        <p className="text-sm font-semibold text-gray-900">{item.query}</p>
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatNumber(item.views)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatNumber(item.sessions)}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {formatNumber(item.clientIds)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
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

          {!isAdminsTab ? (
            <div className="flex flex-wrap rounded-r1 border border-primary/15 bg-white p-0.5 w-fit mb-4">
              {(
                [
                  { key: "general" as const, label: "General" },
                  { key: "add_to_cart" as const, label: "Add to cart" },
                  { key: "checkout" as const, label: "Checkout" },
                  { key: "other_pages" as const, label: "Other pages" },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setVisitorView(item.key);
                    setVisitorPage(1);
                    setVisitorSearch("");
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[calc(var(--radius)-2px)] transition-colors ${
                    visitorView === item.key
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-primary/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {isAdminsTab
                  ? "Admins"
                  : visitorView === "add_to_cart"
                    ? "Add to cart sessions"
                    : visitorView === "checkout"
                      ? "Checkout sessions"
                      : visitorView === "other_pages"
                        ? "Other pages"
                        : "Visitors"}
              </h3>
              <p className="text-xs text-gray-500">
                {isAdminsTab
                  ? "Click a row to see that admin client’s journey. Same account can have many client IDs."
                  : visitorView === "add_to_cart"
                    ? "One row per session that added a product to cart. Click a session to open full journey details."
                    : visitorView === "checkout"
                      ? "One row per session that reached checkout or placed an order. Click a session for full details."
                      : visitorView === "other_pages"
                        ? "Footer pages only (About, Contact, FAQ, Shipping, Privacy, Terms, Cookies, Accessibility). Click a row for the client journey."
                        : "Click a row to see that client’s pages, time on site, and actions (Client #1, #2, …)."}
              </p>
            </div>
            <div className="w-full sm:w-72">
              <Input
                variant="search"
                placeholder={
                  isAdminsTab
                    ? "Search by ID, path, admin email…"
                    : isFunnelVisitorView
                      ? "Search client #, session #, product, path…"
                      : isOtherPagesVisitorView
                        ? "Search client # or page name…"
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

          {isFunnelVisitorView ? (
            funnelLoading && funnelSessions.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-r1 bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : funnelSessions.length === 0 ? (
              <EmptyState
                icon={visitorView === "checkout" ? <MousePointerClick /> : <ShoppingCart />}
                title={
                  visitorView === "checkout"
                    ? "No checkout sessions yet"
                    : "No add-to-cart sessions yet"
                }
                description={
                  visitorView === "checkout"
                    ? "Sessions appear here when a visitor opens /checkout or hits order/checkout events."
                    : "Sessions appear here when a visitor taps Add to cart on the storefront."
                }
              />
            ) : (
              <div
                className={
                  funnelFetching && !funnelLoading
                    ? "opacity-70 transition-opacity"
                    : "opacity-100 transition-opacity"
                }
              >
                <Table
                  pagination={{
                    currentPage: funnelMeta.page,
                    totalPages: funnelMeta.totalPages,
                    pageSize: funnelMeta.limit,
                    totalItems: funnelMeta.total,
                    hasNextPage: funnelMeta.page < funnelMeta.totalPages,
                    hasPreviousPage: funnelMeta.page > 1,
                  }}
                  onPageChange={setVisitorPage}
                  onPageSizeChange={(size) => {
                    setVisitorPageSize(size);
                    setVisitorPage(1);
                  }}
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        sortable
                        sortKey="clientId"
                        currentSort={funnelCurrentSort}
                        onSort={handleFunnelSort}
                      >
                        Client
                      </TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>
                        {visitorView === "add_to_cart" ? "Product" : "Last checkout event"}
                      </TableHead>
                      <TableHead>Matches</TableHead>
                      <TableHead
                        sortable
                        sortKey="events"
                        currentSort={funnelCurrentSort}
                        onSort={handleFunnelSort}
                      >
                        Events
                      </TableHead>
                      <TableHead>Time on site</TableHead>
                      <TableHead
                        sortable
                        sortKey="startedAt"
                        currentSort={funnelCurrentSort}
                        onSort={handleFunnelSort}
                      >
                        Started
                      </TableHead>
                      <TableHead
                        sortable
                        sortKey="lastSeen"
                        currentSort={funnelCurrentSort}
                        onSort={handleFunnelSort}
                      >
                        Last seen
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funnelSessions.map((row) => (
                      <TableRow
                        key={`${row.clientId}-${row.sessionId}`}
                        className="cursor-pointer hover:bg-primary/5"
                        onClick={() => {
                          setSelectedVisitorId(row.clientId);
                          setSelectedSessionId(row.sessionId);
                        }}
                      >
                        <TableCell className="font-semibold text-primary">
                          #{row.clientId}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          #{row.sessionId}
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          {visitorView === "add_to_cart" ? (
                            <>
                              <p className="text-sm text-gray-900 truncate">
                                {row.productName || "—"}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {row.productId != null ? `Product #${row.productId}` : shortPath(row.lastPath)}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-900 truncate">
                                {row.lastEventName || "—"}
                              </p>
                              <p className="text-[11px] text-gray-400 truncate">
                                {shortPath(row.lastPath || row.exitPath || row.landingPath)}
                              </p>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{row.matchCount}</TableCell>
                        <TableCell className="tabular-nums">{row.eventCount}</TableCell>
                        <TableCell>{formatDuration(row.durationSeconds)}</TableCell>
                        <TableCell>{formatDateTime(String(row.startedAt))}</TableCell>
                        <TableCell>{formatDateTime(String(row.lastSeenAt))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : isOtherPagesVisitorView ? (
            footerPagesLoading && footerPageViews.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-r1 bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : footerPageViews.length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No footer page views yet"
                description="Views appear here when a visitor opens a footer page (About, Contact, FAQ, Shipping, Privacy, Terms, Cookies, or Accessibility)."
              />
            ) : (
              <div
                className={
                  footerPagesFetching && !footerPagesLoading
                    ? "opacity-70 transition-opacity"
                    : "opacity-100 transition-opacity"
                }
              >
                <Table
                  pagination={{
                    currentPage: footerPagesMeta.page,
                    totalPages: footerPagesMeta.totalPages,
                    pageSize: footerPagesMeta.limit,
                    totalItems: footerPagesMeta.total,
                    hasNextPage: footerPagesMeta.page < footerPagesMeta.totalPages,
                    hasPreviousPage: footerPagesMeta.page > 1,
                  }}
                  onPageChange={setVisitorPage}
                  onPageSizeChange={(size) => {
                    setVisitorPageSize(size);
                    setVisitorPage(1);
                  }}
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        sortable
                        sortKey="pageName"
                        currentSort={footerPageCurrentSort}
                        onSort={handleFooterPageSort}
                      >
                        Page name
                      </TableHead>
                      <TableHead
                        sortable
                        sortKey="clientId"
                        currentSort={footerPageCurrentSort}
                        onSort={handleFooterPageSort}
                      >
                        Client
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {footerPageViews.map((row) => (
                      <TableRow
                        key={row.eventId}
                        className="cursor-pointer hover:bg-primary/5"
                        onClick={() => {
                          setSelectedVisitorId(row.clientId);
                          setSelectedSessionId(row.sessionId);
                        }}
                      >
                        <TableCell>
                          <p className="text-sm font-semibold text-gray-900">{row.pageName}</p>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          #{row.clientId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : visitorsLoading && visitors.length === 0 ? (
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
