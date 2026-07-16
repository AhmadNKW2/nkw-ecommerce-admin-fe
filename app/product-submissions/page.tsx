import { Suspense } from "react";
import ProductSubmissionsPage from "./ProductSubmissionsPageClient";

export default function ProductSubmissionsRoutePage() {
  return (
    <Suspense fallback={null}>
      <ProductSubmissionsPage />
    </Suspense>
  );
}
