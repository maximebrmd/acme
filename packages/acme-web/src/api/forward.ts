import { Effect } from "effect";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { serverUrl } from "#api/server-url.ts";

export const apiPrefix = "/api/";

// OAuth discovery (RFC 8414, RFC 9728), which clients look for at the root
// of the origin: the server answers it for its authorization server, the
// HTTP API and the MCP endpoint.
const discoveryDocuments = [
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource",
];

/** Whether the server, not a page, answers this path. */
export const servedByApi = (pathname: string): boolean =>
  pathname.startsWith(apiPrefix) ||
  discoveryDocuments.some(
    (document) => pathname === document || pathname.startsWith(`${document}/`)
  );

// Marks a request this proxy forwarded. Were ACME_API_URL to lead back to
// this app, under any name, the forwarded request would come through again
// carrying it, and is refused instead of going round.
export const forwardedHeader = "x-acme-forwarded";

// Rewrites /api/* and the OAuth discovery documents to the Acme server, path
// unchanged, so the browser stays same-origin and the API needs no CORS. The
// server answers under /api itself: the HTTP API, Better Auth, whose emailed
// links point there, and the MCP endpoint. A server URL with this app's own
// origin is refused as well.
export const forwardToApi = Effect.fn("forwardToApi")(function* forward(
  request: NextRequest
) {
  if (request.headers.has(forwardedHeader)) {
    return new NextResponse(null, { status: 508 });
  }

  const base = (yield* serverUrl).replace(/\/+$/u, "");

  const target = new URL(
    `${base}${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  if (target.origin === request.nextUrl.origin) {
    return new NextResponse(null, { status: 502 });
  }

  const headers = new Headers(request.headers);

  headers.set(forwardedHeader, "1");

  return NextResponse.rewrite(target, { request: { headers } });
});
