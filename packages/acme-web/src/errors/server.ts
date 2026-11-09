import { Config, Effect, Option, Schema } from "effect";
import type { Instrumentation } from "next";

import { serverUrl } from "#api/server-url.ts";

import { reportOf } from "./report.ts";

/**
 * The web app's release: ACME_RELEASE, which the production stack sets to
 * the release's tag, read at request time.
 */
export const releaseConfig = Config.String("ACME_RELEASE").pipe(
  Config.withDefault("unknown")
);

type ServerRequest = Parameters<Instrumentation.onRequestError>[1];

type ServerContext = Parameters<Instrumentation.onRequestError>[2];

const decodeUserAgent = Schema.decodeUnknownOption(Schema.String);

/** The report of an error the web app's server met while it answered. */
export const serverReportOf = (
  cause: unknown,
  request: ServerRequest,
  context: ServerContext,
  release: string
) =>
  reportOf(cause, {
    kind: "server",
    page: request.path,
    release,
    route: context.routePath,
    userAgent: Option.getOrNull(decodeUserAgent(request.headers["user-agent"])),
  });

/**
 * Sends the server's error to the Acme server, at ACME_API_URL, within
 * five seconds; a report that fails to go is dropped, as Next logs the
 * error itself.
 */
export const reportServerError = (
  cause: unknown,
  request: ServerRequest,
  context: ServerContext
) =>
  Effect.gen(function* sendReport() {
    const base = (yield* serverUrl).replace(/\/+$/u, "");
    const release = yield* releaseConfig;

    yield* Effect.tryPromise(
      async () =>
        await fetch(`${base}/api/client-errors`, {
          body: JSON.stringify(
            serverReportOf(cause, request, context, release)
          ),
          headers: { "content-type": "application/json" },
          method: "POST",
          signal: AbortSignal.timeout(5000),
        })
    );
  }).pipe(Effect.ignore);
