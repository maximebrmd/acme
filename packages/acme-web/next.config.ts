import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  // A self-contained server for the production image. Tracing starts at the
  // workspace root so packages installed there are included.
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // acme-contract and acme-ui ship TypeScript sources, which Next compiles
  // with the app.
  transpilePackages: ["acme-contract", "acme-ui"],
};

// Loads the request configuration in src/i18n/request.ts. /api/* is forwarded
// to the server by src/proxy.ts, which reads ACME_API_URL at request time.
export default createNextIntlPlugin()(config);
