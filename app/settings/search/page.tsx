"use client";

import { useEffect, useState } from "react";
import { Database, RefreshCw, Search, Trash2 } from "lucide-react";
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
  const [isClearingTypesense, setIsClearingTypesense] = useState(false);
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

  const handleClearTypesense = async () => {
    const confirmed = window.confirm(
      "This will delete ALL items from the Typesense product collection. Search will be empty until you run a backfill. Continue?",
    );

    if (!confirmed) {
      return;
    }

    setIsClearingTypesense(true);
    setErrorMessage(null);

    try {
      const response = await searchAdminService.clearTypesenseCollection();
      setCacheGeneration(response.data.cache_generation);
      await refreshBackfillStatus();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to clear Typesense collection.";
      setErrorMessage(message);
    } finally {
      setIsClearingTypesense(false);
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

  const isBusy =
    isClearingTypesense ||
    isStartingBackfill ||
    Boolean(backfillStatus?.in_progress);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Search />}
        title="Search"
        description="Clear cached search responses or manage the Typesense product index."
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
            <h2 className="text-lg font-semibold">Typesense index</h2>
            <p className="text-sm text-muted-foreground">
              Clear removes every product document from Typesense. Backfill
              reindexes all products from the database.
            </p>
          </div>

          {backfillStatus?.in_progress ? (
            <p className="text-sm text-muted-foreground">
              Typesense index job is running...
            </p>
          ) : backfillStatus?.last_result ? (
            <p className="text-sm text-muted-foreground">
              {backfillStatus.last_result.cleared &&
              backfillStatus.last_result.indexed === 0 ? (
                <>
                  Last action cleared the Typesense collection. Cache generation{" "}
                  <strong>v{backfillStatus.last_result.cache_generation}</strong>.
                </>
              ) : (
                <>
                  Last backfill indexed{" "}
                  <strong>{backfillStatus.last_result.indexed}</strong> products
                  in <strong>{backfillStatus.last_result.batches}</strong>{" "}
                  batches. Cache generation{" "}
                  <strong>v{backfillStatus.last_result.cache_generation}</strong>.
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No clear or backfill has run yet.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleClearTypesense()}
              disabled={isBusy}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isClearingTypesense ? "Clearing..." : "Clear Typesense"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void handleStartBackfill()}
              disabled={isBusy}
            >
              <Database className="mr-2 h-4 w-4" />
              {backfillStatus?.in_progress
                ? "Backfill running..."
                : isStartingBackfill
                  ? "Starting..."
                  : "Run Typesense backfill"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
