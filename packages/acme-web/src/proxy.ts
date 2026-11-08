import { Effect } from "effect";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { serverUrl } from "#api/server-url.ts";
import { routing } from "#i18n/routing.ts";

const handleI18nRouting = createMiddleware(routing);

const apiPrefix = "/api/";

// Rewrites /api/* to the Acme server, so the browser stays same-origin and the
// API needs no CORS. The rewrite lives here rather than in next.config.ts
// because Next resolves config rewrites at build time; here ACME_API_URL is
// read per request.
const forwardToApi = (request: NextRequest) => {
  const base = Effect.runSync(serverUrl).replace(/\/+$/u, "");
  const path = request.nextUrl.pathname.slice(apiPrefix.length - 1);

  return NextResponse.rewrite(
    new URL(`${base}${path}${request.nextUrl.search}`)
  );
};

// Everything else is a page: negotiate its locale, with English unprefixed and
// French under /fr.
const proxy = (request: NextRequest) =>
  request.nextUrl.pathname.startsWith(apiPrefix)
    ? forwardToApi(request)
    : handleI18nRouting(request);

export default proxy;

export const config = {
  // /api/*, and pages: not Next's own files nor anything with a dot, such as
  // favicon.ico.
  matcher: ["/api/:path*", "/((?!api|_next|.*\\..*).*)"],
};
