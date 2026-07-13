export type InvalidateSearchCacheResponse = {
  message: string;
  cache_generation: number;
};

export type StartTypesenseBackfillResponse = {
  message: string;
  status: "running";
};

export type ClearTypesenseCollectionResponse = {
  message: string;
  indexed: number;
  batches: number;
  cache_generation: number;
  cleared?: boolean;
};

export type TypesenseBackfillResult = {
  indexed: number;
  batches: number;
  cache_generation: number;
  cleared?: boolean;
};

export type TypesenseBackfillStatus = {
  in_progress: boolean;
  last_result: TypesenseBackfillResult | null;
  last_error: string | null;
};
