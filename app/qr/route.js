import { content } from "../../lib/store.mjs";
export const dynamic = "force-dynamic";
export async function GET(req) {
  const { value } = await content();
  return new Response(null, {
    status: 307,
    headers: {
      Location: new URL(
        value.settings.qrTarget,
        process.env.PUBLIC_ORIGIN || req.url,
      ).href,
      "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}
