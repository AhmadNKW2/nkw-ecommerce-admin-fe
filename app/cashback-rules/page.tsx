"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import {
  useCashbackRules,
  useDeleteCashbackRule,
} from "../src/services/cashback-rules/hooks/use-cashback-rules";
import type { CashbackRule } from "../src/services/cashback-rules/types/cashback-rule.types";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { Badge } from "../src/components/ui/badge";
import { EmptyState } from "../src/components/common/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import { Wallet, Plus, Trash2, Pencil, RefreshCw } from "lucide-react";

function formatCurrency(value?: number | null) {
  if (value == null) {
    return "-";
  }

  return `${Number(value).toFixed(2)} JOD`;
}

function formatRewardValue(rule: CashbackRule) {
  if (rule.type === "percentage") {
    return `${Number(rule.value).toFixed(2)}%`;
  }

  return formatCurrency(rule.value);
}

export default function CashbackRulesPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [search, setSearch] = useState("");
  const [ruleToDelete, setRuleToDelete] = useState<CashbackRule | null>(null);

  const { data: rules, isLoading, isError, error, refetch } = useCashbackRules();
  const deleteRule = useDeleteCashbackRule();

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  const filteredRules = useMemo(() => {
    const list = Array.isArray(rules) ? rules : [];
    if (!search.trim()) return list;
    const term = search.trim().toLowerCase();
    return list.filter((r) => {
      return (
        String(r.id).includes(term) ||
        String(r.name ?? "").toLowerCase().includes(term) ||
        String(r.type ?? "").toLowerCase().includes(term)
      );
    });
  }, [rules, search]);

  const stats = useMemo(() => {
    const list = Array.isArray(rules) ? rules : [];
    const activeCount = list.filter((rule) => rule.isActive).length;
    const inactiveCount = list.length - activeCount;
    const strongestRule = list.reduce<CashbackRule | null>((best, candidate) => {
      if (!best) {
        return candidate;
      }

      const bestValue = best.type === "percentage" ? Number(best.value) : Number(best.value) * 100;
      const candidateValue = candidate.type === "percentage" ? Number(candidate.value) : Number(candidate.value) * 100;

      return candidateValue > bestValue ? candidate : best;
    }, null);

    return {
      total: list.length,
      activeCount,
      inactiveCount,
      strongestRule,
    };
  }, [rules]);

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    await deleteRule.mutateAsync(ruleToDelete.id);
    setRuleToDelete(null);
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Wallet />}
        title="Cashback Rules"
        description="Manage rewards that are applied automatically when delivered paid orders qualify."
        action={{
          label: "Create Rule",
          onClick: () => router.push("/cashback-rules/create"),
        }}
      />

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="gap-2">
          <p className="text-sm text-third">Total rules</p>
          <p className="text-3xl font-bold text-primary">{stats.total}</p>
          <p className="text-sm text-third">{filteredRules.length} visible in the current view</p>
        </Card>
        <Card className="gap-2">
          <p className="text-sm text-third">Active rules</p>
          <p className="text-3xl font-bold text-primary">{stats.activeCount}</p>
          <p className="text-sm text-third">{stats.inactiveCount} inactive rules remain available for later use</p>
        </Card>
        <Card className="gap-2">
          <p className="text-sm text-third">Strongest rule</p>
          <p className="text-lg font-semibold text-primary">
            {stats.strongestRule ? stats.strongestRule.name : "No rule yet"}
          </p>
          <p className="text-sm text-third">
            {stats.strongestRule ? formatRewardValue(stats.strongestRule) : "Create a rule to start rewarding customers."}
          </p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              label="Search"
              placeholder="Search by id, rule name, or reward type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              isSearch
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} color="var(--color-primary)">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => router.push("/cashback-rules/create")}
            color="var(--color-primary)"
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>
      </Card>

      {isError ? (
        <div>
          <EmptyState
            icon={<Wallet />}
            title="Failed to load cashback rules"
            description={(error as any)?.message || "Please try again."}
          />
          <div className="flex justify-center">
            <Button onClick={() => refetch()} color="var(--color-primary)">
              Retry
            </Button>
          </div>
        </div>
      ) : filteredRules.length === 0 ? (
        <div>
          <EmptyState
            icon={<Wallet />}
            title="No cashback rules"
            description="Create your first cashback rule to start rewarding customers."
          />
          <div className="flex justify-center">
            <Button onClick={() => router.push("/cashback-rules/create")} color="var(--color-primary)">
              Create Rule
            </Button>
          </div>
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <Table noPagination={true}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Max Cashback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule) => (
                <TableRow key={rule.id} className="hover:bg-primary/5">
                  <TableCell className="font-mono">#{rule.id}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium text-primary">{rule.name}</p>
                      <p className="text-xs text-third">Updated for automated delivered-order rewards</p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{String(rule.type)}</TableCell>
                  <TableCell className="font-medium text-primary">{formatRewardValue(rule)}</TableCell>
                  <TableCell>{formatCurrency(rule.minOrderAmount ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(rule.maxCashbackAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? "success" : "danger"}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        href={`/cashback-rules/${rule.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        color="var(--color-primary)"
                        className="px-2"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRuleToDelete(rule)}
                        color="var(--color-danger)"
                        className="px-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <DeleteConfirmationModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={deleteRule.isPending}
        title="Delete cashback rule?"
        message={`This will delete \"${ruleToDelete?.name ?? ""}\".`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
