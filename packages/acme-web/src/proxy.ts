import { Effect } from "effect";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { apiPrefix, forwardToApi } from "#api/forward.ts";
import { routing } from "#i18n/routing.ts";

const handleI18nRouting = createMiddleware(routing);

// /api/* goes to the Acme server (see src/api/forward.ts). The rewrite lives
// here rather than in next.config.ts because Next resolves config rewrites at
// build time; here ACME_API_URL is read per request. Everything else is a
// page: negotiate its locale, with English unprefixed and French under /fr.
const proxy = (request: NextRequest) =>
  request.nextUrl.pathname.startsWith(apiPrefix)
    ? Effect.runSync(forwardToApi(request))
    : handleI18nRouting(request);

export default proxy;

export const config = {
  // /api/*, and pages: not Next's own files nor anything with a dot, such as
  // favicon.ico.
  matcher: ["/api/:path*", "/((?!api|_next|.*\\..*).*)"],
};
