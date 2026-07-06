"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/hooks/use-loading-router";
import { PageHeader } from "../../src/components/common/PageHeader";
import { Button } from "../../src/components/ui/button";
import { EmptyState } from "../../src/components/common/EmptyState";
import { Wallet } from "lucide-react";
import {
  useCashbackRules,
  useUpdateCashbackRule,
} from "../../src/services/cashback-rules/hooks/use-cashback-rules";
import { CashbackRuleForm } from "../../src/components/cashback-rules/CashbackRuleForm";
import type { CreateCashbackRuleDto } from "../../src/services/cashback-rules/types/cashback-rule.types";

export default function EditCashbackRulePage() {
  const router = useRouter();
  const params = useParams();

  const id = useMemo(() => {
    const raw = (params as any)?.id;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [params]);

  const { data: rules, isLoading, isError, error } = useCashbackRules();
  const updateRule = useUpdateCashbackRule();

  const rule = useMemo(() => {
    const list = Array.isArray(rules) ? rules : [];
    return list.find((r) => r.id === id);
  }, [rules, id]);

  const handleSubmit = async (data: CreateCashbackRuleDto) => {
    await updateRule.mutateAsync({ id, data });
    router.push("/cashback-rules");
  };

  if (isError) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Wallet />}
          title="Failed to load cashback rule"
          description={(error as any)?.message || "Please try again."}
        />
        <div className="flex justify-center">
          <Button onClick={() => router.push("/cashback-rules")} color="var(--color-primary)">
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoading && !rule) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Wallet />}
          title="Rule not found"
          description="This rule may have been deleted."
        />
        <div className="flex justify-center">
          <Button onClick={() => router.push("/cashback-rules")} color="var(--color-primary)">
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Wallet />}
        title={rule ? `Edit Rule #${rule.id}` : "Edit Rule"}
        description="Refine how this cashback rule rewards delivered paid orders."
        cancelAction={{ label: "Back", onClick: () => router.push("/cashback-rules"), disabled: updateRule.isPending }}
      />

      {rule && (
        <CashbackRuleForm
          key={rule.id}
          initial={rule}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/cashback-rules")}
          isLoading={updateRule.isPending}
          submitLabel="Save Changes"
        />
      )}
    </div>
  );
}
