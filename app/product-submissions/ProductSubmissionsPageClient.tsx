"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/auth.context";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import { SubmissionsPanel } from "@/components/vendor-submissions/SubmissionsPanel";

export default function ProductSubmissionsPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const isVendor = isSimplifiedProductCreator(user);

  useEffect(() => {
    if (isVendor) {
      router.replace("/products?create=1");
    }
  }, [isVendor, router]);

  if (isVendor) {
    return null;
  }

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Boxes />}
        title="AI Product Submissions"
        description="Open a submission to review original details, AI output, brand, category, and specs."
      />

      <SubmissionsPanel />
    </div>
  );
}
