"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PricingProductsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/products?view=pricing");
  }, [router]);

  return null;
}
