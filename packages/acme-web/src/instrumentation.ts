import { Effect } from "effect";
import type { Instrumentation } from "next";

import { reportServerError } from "#errors/server.ts";

// Errors the web app's server met while rendering a page, answering a
// route or running the proxy, reported to the Acme server.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  await Effect.runPromise(reportServerError(error, request, context));
};
