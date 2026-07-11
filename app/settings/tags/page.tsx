import { redirect } from "next/navigation";

export default function LegacyTagsSettingsPage() {
  redirect("/settings/terms");
}
