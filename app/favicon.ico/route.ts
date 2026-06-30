import { fetchSiteLogoImageResponse } from "../src/lib/seo-settings-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await fetchSiteLogoImageResponse();
  return response ?? new Response(null, { status: 404 });
}
