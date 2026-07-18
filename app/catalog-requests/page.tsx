"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

function CatalogRequestsRedirectInner() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/product-submissions");
  }, [router]);

  return null;
}

/** Legacy route — redirects into AI Product Submissions. */
export default function CatalogRequestsRedirectPage() {
  return (
    <Suspense fallback={null}>
      <CatalogRequestsRedirectInner />
    </Suspense>
  );
}
