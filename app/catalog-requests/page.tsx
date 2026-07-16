"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CatalogRequestsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get("type");
    const tab =
      type === "category"
        ? "categories"
        : type === "specs"
          ? "specs"
          : "brands";
    router.replace(`/product-submissions?tab=${tab}`);
  }, [router, searchParams]);

  return null;
}

/** Legacy route — redirects into the unified AI Submissions tabs. */
export default function CatalogRequestsRedirectPage() {
  return (
    <Suspense fallback={null}>
      <CatalogRequestsRedirectInner />
    </Suspense>
  );
}
