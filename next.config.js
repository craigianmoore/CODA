/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  // Headless Chromium for the server-side PDF route must stay a plain Node
  // dependency (not bundled), and its binary files must ship with the route.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};
module.exports = nextConfig;
