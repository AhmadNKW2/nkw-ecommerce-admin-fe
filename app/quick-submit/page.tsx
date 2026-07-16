"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";

function QuickSubmitRedirectInner() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/products/create");
  }, [router]);

  return null;
}

/** Legacy route — vendors create from the products list. */
export default function QuickSubmitRedirectPage() {
  return (
    <Suspense fallback={null}>
      <QuickSubmitRedirectInner />
    </Suspense>
  );
}
