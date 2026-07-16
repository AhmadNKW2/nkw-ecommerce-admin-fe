"use client";

import { Package } from "lucide-react";
import { useRouter } from "@/hooks/use-loading-router";
import { PageHeader } from "@/components/common/PageHeader";
import { QuickSubmitForm } from "@/components/vendor-submissions/QuickSubmitForm";
import { useVendorLocale } from "@/contexts/vendor-locale.context";

export function VendorCreateProductPage() {
  const router = useRouter();
  const { copy, isRtl } = useVendorLocale();

  return (
    <div className="admin-page" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        icon={<Package />}
        title={copy.createProduct}
        description={copy.createProductDescription}
        cancelAction={{
          label: copy.cancel,
          onClick: () => router.push("/products"),
        }}
      />
      <QuickSubmitForm
        silentSuccess
        hideHeading
        onCancel={() => router.push("/products")}
        onSuccess={() => router.push("/products")}
      />
    </div>
  );
}
