// Server-side HTML -> PDF using headless Chromium.
//
// Why: the browser-side exporter (html2canvas + jsPDF) photographs the page,
// so text is pixels — soft when zoomed and not selectable. Printing the very
// same report HTML through Chromium produces a real vector PDF: crisp text at
// any zoom, selectable/searchable, and a much smaller file.
//
// The client (saveHtmlAsPdf in CoachObservationApp.jsx) falls back to the old
// canvas exporter if this route is unavailable, so a failure here never
// leaves the user without a PDF.
//
// Safety: scripts are disabled and the page may only load data: URIs and
// this app's own origin (logos arrive via /api/logo-proxy, which has its own
// host allow-list), so the HTML can't be used to reach other sites or
// internal networks. Requests must come from this app's own origin.
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_HTML_BYTES = 6 * 1024 * 1024;

export async function POST(request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const callerOrigin = request.headers.get("origin");
  if (callerOrigin && callerOrigin !== origin) {
    return new Response("Forbidden", { status: 403 });
  }

  let html;
  try {
    ({ html } = await request.json());
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (typeof html !== "string" || !html.length) return new Response("Bad request", { status: 400 });
  if (html.length > MAX_HTML_BYTES) return new Response("Too large", { status: 413 });

  // Make relative URLs (the logo proxy) resolve against this app.
  const withBase = html.replace(/<head[^>]*>/i, (m) => `${m}<base href="${origin}/">`);

  let browser;
  try {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    const localPath = process.env.PDF_CHROMIUM_PATH;
    browser = await puppeteer.launch({
      args: localPath ? ["--no-sandbox", "--disable-setuid-sandbox"] : chromium.args,
      executablePath: localPath || (await chromium.executablePath()),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const u = req.url();
      if (u.startsWith("data:") || u.startsWith("about:") || u.startsWith(origin + "/")) req.continue();
      else req.abort();
    });
    await page.setContent(withBase, { waitUntil: "networkidle0", timeout: 30000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
    return new Response(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("PDF render failed:", e);
    return new Response("PDF render failed", { status: 500 });
  } finally {
    if (browser) { try { await browser.close(); } catch {} }
  }
}
