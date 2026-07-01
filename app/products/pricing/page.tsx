import { redirect } from "next/navigation";

export default function ProductsPricingPage() {
  redirect("/products?view=pricing");
}
