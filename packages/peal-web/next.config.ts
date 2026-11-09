import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// The policy forbids what the app never needs: being framed by other sites,
// plugins, a <base> pointing elsewhere and forms posting away. It leaves
// scripts and styles to their defaults, since Next inlines both.
const contentSecurityPolicy = [
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join("; ");

// Headers config is read at build time, so production builds pin HTTPS and
// `next dev` does not, which would otherwise pin it for every app on
// localhost.
const strictTransportSecurity =
  process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : [];

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  ...strictTransportSecurity,
];

const config: NextConfig = {
  // How long, in milliseconds, a request that src/proxy.ts forwards may take
  // before Next answers 500 instead: 30 seconds unless set. The writing
  // assistant waits up to 90 seconds for its language model (peal-server's
  // src/assistant/infrastructure/language-model-writing-model.ts), so this
  // waits longer.
  experimental: { proxyTimeout: 120_000 },
  // Every page and every /api response proxied to the server.
  headers: async () =>
    await Promise.resolve([{ headers: securityHeaders, source: "/:path*" }]),
  // A self-contained server for the production image. Tracing starts at the
  // workspace root so packages installed there are included.
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // No X-Powered-By header.
  poweredByHeader: false,
  // peal-contract and peal-ui ship TypeScript sources, which Next compiles
  // with the app.
  transpilePackages: ["peal-contract", "peal-ui"],
};

// Loads the request configuration in src/i18n/request.ts. /api/* is forwarded
// to the server by src/proxy.ts, which reads PEAL_API_URL at request time.
export default createNextIntlPlugin()(config);
