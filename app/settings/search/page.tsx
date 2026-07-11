"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { searchAdminService } from "../../src/services/search/api/search-admin.service";
import type { TypesenseBackfillStatus } from "../../src/services/search/types/search-admin.types";

export default function SearchSettingsPage() {
  const [cacheGeneration, setCacheGeneration] = useState<number | null>(null);
  const [backfillStatus, setBackfillStatus] =
    useState<TypesenseBackfillStatus | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isStartingBackfill, setIsStartingBackfill] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshBackfillStatus = async () => {
    try {
      const response = await searchAdminService.getTypesenseBackfillStatus();
      setBackfillStatus(response.data);
      if (response.data.last_error) {
        setErrorMessage(response.data.last_error);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load backfill status.";
      setErrorMessage(message);
    }
  };

  useEffect(() => {
    void refreshBackfillStatus();
  }, []);

  useEffect(() => {
    if (!backfillStatus?.in_progress) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshBackfillStatus();
    }, 3000);

    return () => {
      window.clearInterval(timer);
    };
  }, [backfillStatus?.in_progress]);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    setErrorMessage(null);

    try {
      const response = await searchAdminService.invalidateSearchCache();
      setCacheGeneration(response.data.cache_generation);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to clear search cache.";
      setErrorMessage(message);
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleStartBackfill = async () => {
    setIsStartingBackfill(true);
    setErrorMessage(null);

    try {
      await searchAdminService.startTypesenseBackfill();
      await refreshBackfillStatus();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start Typesense backfill.";
      setErrorMessage(message);
    } finally {
      setIsStartingBackfill(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Search />}
        title="Search"
        description="Clear cached search responses or rebuild the Typesense index from the database."
      />
      <SettingsNav />

      {errorMessage ? (
        <Card className="border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {errorMessage}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Clear search cache</h2>
            <p className="text-sm text-muted-foreground">
              Bumps the cache generation so new searches skip stale 5-minute
              responses. Use this after deploys or ranking tweaks without
              restarting the server.
            </p>
          </div>

          {cacheGeneration !== null ? (
            <p className="text-sm text-muted-foreground">
              Cache generation is now <strong>v{cacheGeneration}</strong>.
            </p>
          ) : null}

          <Button
            type="button"
            onClick={() => void handleClearCache()}
            disabled={isClearingCache}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isClearingCache ? "Clearing..." : "Clear search cache"}
          </Button>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Typesense backfill</h2>
            <p className="text-sm text-muted-foreground">
              Reindexes all products from Postgres into Typesense, then clears
              search cache. Runs in the background; this page polls until it
              finishes.
            </p>
          </div>

          {backfillStatus?.in_progress ? (
            <p className="text-sm text-muted-foreground">Backfill is running...</p>
          ) : backfillStatus?.last_result ? (
            <p className="text-sm text-muted-foreground">
              Last run indexed{" "}
              <strong>{backfillStatus.last_result.indexed}</strong> products in{" "}
              <strong>{backfillStatus.last_result.batches}</strong> batches. Cache
              generation{" "}
              <strong>v{backfillStatus.last_result.cache_generation}</strong>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No backfill has run yet.</p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleStartBackfill()}
            disabled={isStartingBackfill || backfillStatus?.in_progress}
          >
            <Database className="mr-2 h-4 w-4" />
            {backfillStatus?.in_progress
              ? "Backfill running..."
              : isStartingBackfill
                ? "Starting..."
                : "Run Typesense backfill"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
