"use client";

import { useRouter } from "@/hooks/use-loading-router";
import { PageHeader } from "../../src/components/common/PageHeader";
import { Wallet } from "lucide-react";
import { useCreateCashbackRule } from "../../src/services/cashback-rules/hooks/use-cashback-rules";
import { CashbackRuleForm } from "../../src/components/cashback-rules/CashbackRuleForm";
import type { CreateCashbackRuleDto } from "../../src/services/cashback-rules/types/cashback-rule.types";

export default function CreateCashbackRulePage() {
  const router = useRouter();
  const createRule = useCreateCashbackRule();

  const handleSubmit = async (data: CreateCashbackRuleDto) => {
    await createRule.mutateAsync(data as any);
    router.push("/cashback-rules");
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Wallet />}
        title="Create Cashback Rule"
        description="Create a reward rule that can be applied automatically to qualifying delivered paid orders."
        cancelAction={{ label: "Back", onClick: () => router.push("/cashback-rules"), disabled: createRule.isPending }}
      />

      <CashbackRuleForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/cashback-rules")}
        isLoading={createRule.isPending}
        submitLabel="Create Rule"
      />
    </div>
  );
}
