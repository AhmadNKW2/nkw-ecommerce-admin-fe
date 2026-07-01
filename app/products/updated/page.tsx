import { redirect } from "next/navigation";

export default function UpdatedProductsPage() {
  redirect("/products?status=updated");
}
