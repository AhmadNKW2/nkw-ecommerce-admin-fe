export type AnalyticsRange = "7d" | "28d" | "90d" | "365d";

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
  userId: number | null;
  lastPath: string | null;
  eventCount: number;
  sessionCount: number;
  totalDurationSeconds: number;
  firstSeenAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  isAdmin?: boolean;
  admin?: {
    userId: number;
    email: string;
    name: string;
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
};
