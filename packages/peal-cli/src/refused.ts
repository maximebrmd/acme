import { Data } from "effect";
import { CliError } from "effect/cli";

import type { JsonObject } from "#api-error.ts";

/**
 * The line that names a request in what a failure prints: its id, as the
 * server's `X-Request-Id` gives it, and the error's code. People quote it
 * when they ask for help, and the server's logs are found by it.
 */
export const requestLine = (
  requestId: string | undefined,
  code?: string
): readonly string[] =>
  requestId === undefined
    ? []
    : [`  Request ${requestId}${code === undefined ? "" : ` (${code})`}.`];

// The server answered, and refused what the command asked: the command
// line prints why, then the request's id when the server gave one, and
// exits with 1. A refusal of the command line's own, before any request,
// has a reason and a code of its own, and no API error.
export class Refused extends Data.TaggedError("Refused")<{
  readonly code?: string | undefined;
  // The API's error, in the contract's encoding, which --json prints.
  readonly error?: JsonObject | undefined;
  readonly reason: string;
  readonly requestId?: string | undefined;
}> {
  override get [CliError.userMessage]() {
    return [this.reason, ...requestLine(this.requestId, this.code)].join("\n");
  }

  /** What --json prints for it: the API's error, or the command line's. */
  get jsonFailure(): JsonObject {
    return {
      code: this.code ?? "refused",
      message: this.reason,
      ...this.error,
    };
  }
}
