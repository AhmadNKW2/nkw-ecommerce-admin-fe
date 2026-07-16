export type AnalyticsRange =
  | "1d"
  | "2d"
  | "3d"
  | "7d"
  | "28d"
  | "90d"
  | "365d";

export type AnalyticsNamedValue = {
  name: string;
  value: number;
};

export type AnalyticsTimePoint = {
  date: string;
  activeUsers: number;
  sessions: number;
  pageViews: number;
  engagedSessions: number;
};

export type AnalyticsKpi = {
  label: string;
  key: string;
  value: number;
  previousValue: number;
  changePercent: number | null;
  format: "number" | "percent" | "duration" | "decimal";
};

export type AnalyticsOverview = {
  propertyId: string;
  range: {
    startDate: string;
    endDate: string;
    previousStartDate: string;
    previousEndDate: string;
    label: string;
  };
  kpis: AnalyticsKpi[];
  timeseries: AnalyticsTimePoint[];
  topPages: AnalyticsNamedValue[];
  trafficSources: AnalyticsNamedValue[];
  devices: AnalyticsNamedValue[];
  countries: AnalyticsNamedValue[];
  events: AnalyticsNamedValue[];
};

export type AnalyticsOverviewParams = {
  range?: AnalyticsRange;
  startDate?: string;
  endDate?: string;
};

export type AnalyticsVisitorListItem = {
  id: number;
  /** Unique list row id when the same Client # appears for multiple admins. */
  rowKey?: string;
  userId: number | null;
  lastPath: string | null;
  eventCount: number;
  sessionCount: number;
  totalDurationSeconds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  deviceType?: string | null;
  deviceModel?: string | null;
  deviceLabel?: string | null;
  isAdmin?: boolean;
  admin?: {
    userId: number;
    email: string;
    name: string;
    deviceId?: number | null;
    deviceName?: string | null;
    deviceType?: string | null;
    deviceModel?: string | null;
    source?: string | null;
  } | null;
};

export type AnalyticsVisitorEvent = {
  id: number;
  sessionId: number;
  name: string;
  path: string | null;
  properties: Record<string, unknown> | null;
  occurredAt: string;
};

export type AnalyticsVisitorSession = {
  id: number;
  landingPath: string | null;
  exitPath: string | null;
  eventCount: number;
  pageViewCount: number;
  durationSeconds: number;
  startedAt: string;
  lastSeenAt: string;
};

export type AnalyticsVisitorDetail = AnalyticsVisitorListItem & {
  sessions: AnalyticsVisitorSession[];
  events: AnalyticsVisitorEvent[];
};

export type AnalyticsVisitorsParams = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  audience?: "visitors" | "admins";
  sortBy?:
    | "lastPath"
    | "sessions"
    | "events"
    | "duration"
    | "firstSeen"
    | "lastSeen"
    | "deviceName"
    | "admin";
  sortOrder?: "asc" | "desc";
};

export type AnalyticsPopularProduct = {
  productId: number | null;
  slug: string | null;
  name: string;
  nameAr: string | null;
  views: number;
  sessions: number;
  clicks: number;
  clientIds: number;
  viewsSource?: "ga4" | "first_party";
};

export type AnalyticsPopularProductsMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  includeAdmin?: boolean;
  sortBy?: string;
  sortOrder?: string;
  viewsSource?: "ga4" | "first_party" | string;
  totals?: {
    views: number;
    sessions: number;
    clicks: number;
  };
  adminContribution?: {
    adminViews: number;
    adminClicks: number;
    adminDevices: number;
  };
  toggleHasEffect?: boolean;
};

export type AnalyticsPopularProductsParams = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  /** 1 = with admin, 0 = without (avoids boolean query-string bugs) */
  includeAdmin?: boolean | 0 | 1;
  sortBy?: "views" | "sessions" | "clientIds" | "clicks";
  sortOrder?: "asc" | "desc";
};

export type AnalyticsSearchQuery = {
  query: string;
  views: number;
  sessions: number;
  clientIds: number;
};

export type AnalyticsSearchQueriesMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  includeAdmin?: boolean;
  sortBy?: string;
  sortOrder?: string;
  adminContribution?: {
    adminSearches: number;
    adminClientIds: number;
    adminDevices: number;
  };
  toggleHasEffect?: boolean;
};

export type AnalyticsSearchQueriesParams = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  /** 1 = with admin, 0 = without */
  includeAdmin?: boolean | 0 | 1;
  sortBy?: "views" | "sessions" | "clientIds";
  sortOrder?: "asc" | "desc";
};

export type AnalyticsDateCoverageScope =
  | "overview"
  | "products"
  | "search"
  | "visitors"
  | "admins";

export type AnalyticsDateCoveragePill = {
  key: AnalyticsRange;
  label: string;
  days: number;
  hasData: boolean;
};

export type AnalyticsDateCoverage = {
  scope: AnalyticsDateCoverageScope;
  earliestAt: string | null;
  latestAt: string | null;
  pills: AnalyticsDateCoveragePill[];
  suggested: AnalyticsRange | null;
};
