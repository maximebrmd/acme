import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { ClientErrorIntake } from "./client-error-intake.ts";

/** The longest error report the server reads, in bytes. */
export const maxClientErrorBytes = 16 * 1024;

/**
 * The longest each field may be, in characters. Clients cut what is longer,
 * the stack from its end, so a report always fits in `maxClientErrorBytes`.
 */
export const clientErrorLimits = {
  digest: 64,
  message: 1000,
  path: 1000,
  release: 64,
  route: 200,
  stack: 8000,
  userAgent: 400,
} as const;

/**
 * Where the error was caught:
 *
 * - `uncaught`: an error nothing caught in the browser;
 * - `unhandledRejection`: a promise rejected without a handler;
 * - `boundary`: a page's error boundary showed its error page;
 * - `server`: the web app's server failed to render a page.
 */
export const ClientErrorKindSchema = Schema.Literals([
  "uncaught",
  "unhandledRejection",
  "boundary",
  "server",
]).annotate({ identifier: "ClientErrorKind" });

export type ClientErrorKind = typeof ClientErrorKindSchema.Type;

const upTo = (length: number) =>
  Schema.String.check(Schema.isMaxLength(length));

// A path without its query or fragment, which can carry tokens.
const PathSchema = upTo(clientErrorLimits.path).check(
  Schema.isPattern(/^\/[^?#]*$/u, {
    description: "a path without a query or a fragment",
  })
);

/**
 * An error the web app ran into, without anything that names who met it: no
 * user or workspace, no query, no cookie. The server reads nothing else.
 */
export const ClientErrorReportSchema = Schema.Struct({
  // Next's digest of an error it rendered on the server, to find its log.
  digest: Schema.NullOr(upTo(clientErrorLimits.digest)),
  kind: ClientErrorKindSchema,
  message: upTo(clientErrorLimits.message),
  // The page's path, ids replaced by `:id`.
  path: PathSchema,
  // The web app's release.
  release: upTo(clientErrorLimits.release),
  // The page's route, such as /[locale]/app/[workspaceId]/calendar.
  route: Schema.NullOr(upTo(clientErrorLimits.route)),
  stack: Schema.NullOr(upTo(clientErrorLimits.stack)),
  userAgent: Schema.NullOr(upTo(clientErrorLimits.userAgent)),
}).annotate({ identifier: "ClientErrorReport" });

export type ClientErrorReport = typeof ClientErrorReportSchema.Type;

/**
 * Error reports from the web app, in browsers and on its server. No
 * credentials: anyone may send one, so each address may send a few a
 * minute, and the server logs and counts them.
 */
export class ClientErrorsApi extends HttpApiGroup.make("clientErrors", {
  topLevel: true,
})
  .add(
    HttpApiEndpoint.post("reportClientError", "/api/client-errors", {
      payload: ClientErrorReportSchema,
      success: HttpApiSchema.NoContent.annotate({
        description: "The report was logged.",
      }),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Logs an error the web app ran into. The body is at most ${maxClientErrorBytes} bytes, and each address may send 30 reports a minute; more answer 429 and are dropped. A report names nobody: the page's path without its query, its route, the release, the message, the stack and the browser.`,
        summary: "Report a web app error",
      })
    )
  )
  .middleware(ClientErrorIntake) {}
