// Server-side proxy for external Member Federation logo images.
//
// Why this exists: PDF exports render a page into a canvas (html2canvas)
// with useCORS: true, which requires each image to be fetched with CORS
// permission from its own server. footballaustralia.com.au (the host for
// every MEMBER_FEDERATIONS logo) does not send Access-Control-Allow-Origin
// headers, so a cross-origin CORS-mode fetch of those images always fails
// — the logo displays fine as a normal <img> elsewhere in the app (that
// does not need CORS), but renders as a blank box in any PDF export.
// Fetching the image here, server-side, sidesteps the browser's CORS
// check entirely (Node has no same-origin policy), and re-serving it from
// this app's own origin means the client-side fetch is same-origin and
// therefore never CORS-blocked.
//
// Host allow-list: only footballaustralia.com.au (every MEMBER_FEDERATIONS
// logo is hosted there) — deliberately not an open proxy for arbitrary URLs.
const ALLOWED_HOSTS = ["footballaustralia.com.au"];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url parameter", { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new Response("Host not allowed", { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(parsed.toString());
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "image/png";
  const buffer = await upstream.arrayBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      // Logo images are effectively static, so cache aggressively.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
