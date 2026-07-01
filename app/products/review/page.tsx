import { redirect } from "next/navigation";

export default function ReviewProductsPage() {
  redirect("/products?view=review");
}
