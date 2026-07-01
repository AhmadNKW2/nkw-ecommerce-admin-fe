import { Suspense } from "react";
import ProductsPageClient from "./ProductsPageClient";

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageClient />
    </Suspense>
  );
}
