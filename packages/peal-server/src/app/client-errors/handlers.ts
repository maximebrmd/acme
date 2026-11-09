import { Api } from "peal-contract";
import type { ClientErrorReport } from "peal-contract";
import { Effect, Metric } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { redacted } from "./redaction.ts";

/** Error reports logged, by kind: uncaught, unhandledRejection, boundary, server. */
export const clientErrors = Metric.counter("peal.client_errors", {
  description: "Errors the web app reported, in browsers and on its server",
  incremental: true,
});

// Annotates the log with an attribute the report may leave out.
const annotateIf =
  (name: string, value: string | null) =>
  <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    value === null ? self : self.pipe(Effect.annotateLogs(name, value));

// The log, with OpenTelemetry's names for its attributes where it has
// them. Loki keeps them as structured metadata (event_name, url_path…).
const logOf = (report: ClientErrorReport) =>
  Effect.logError("The web app reported an error").pipe(
    Effect.annotateLogs({
      "peal.client_error.kind": report.kind,
      "peal.web.release": report.release,
      "event.name": "peal.client_error",
      "exception.message": report.message,
      "url.path": report.path,
    }),
    annotateIf("peal.client_error.digest", report.digest),
    annotateIf("exception.stacktrace", report.stack),
    annotateIf("http.route", report.route),
    annotateIf("user_agent.original", report.userAgent)
  );

/**
 * Logs each report at error level, so it reaches Loki with the server's
 * logs, and counts it.
 */
export const ClientErrorsHandlers = HttpApiBuilder.group(
  Api,
  "clientErrors",
  (handlers) =>
    handlers.handleAll({
      reportClientError: ({ payload }) => {
        const report = redacted(payload);

        return logOf(report).pipe(
          Effect.andThen(
            Metric.update(
              Metric.withAttributes(clientErrors, { kind: report.kind }),
              1
            )
          )
        );
      },
    })
);
