import { Effect } from "effect";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { serverUrl } from "#api/server-url.ts";

export const apiPrefix = "/api/";

// Rewrites /api/* to the Acme server, so the browser stays same-origin and the
// API needs no CORS. The server has no routes under /api/ of its own, so a
// path still under it after the prefix is refused: were ACME_API_URL to point
// back at this app, /api/api/… would otherwise re-enter the proxy once per
// segment. A server URL with this app's own origin is refused as well.
export const forwardToApi = Effect.fn("forwardToApi")(function* forward(
  request: NextRequest
) {
  const base = (yield* serverUrl).replace(/\/+$/u, "");
  const path = request.nextUrl.pathname.slice(apiPrefix.length - 1);

  if (path.startsWith(apiPrefix)) {
    return new NextResponse(null, { status: 404 });
  }

  const target = new URL(`${base}${path}${request.nextUrl.search}`);

  if (target.origin === request.nextUrl.origin) {
    return new NextResponse(null, { status: 502 });
  }

  return NextResponse.rewrite(target);
});
