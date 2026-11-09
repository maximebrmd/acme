import { Data, Option, Schema } from "effect";
import { CliError } from "effect/cli";
import type { HttpClientError } from "effect/http";

// The request did not get an answer the command could use: the server is
// unreachable (refused connection, unknown host), or it answered with an
// error status or a body the contract does not describe.
//
// Data.TaggedError rather than Schema.TaggedError: this error is printed,
// never encoded, so it needs no schema.
export class ApiRequestFailed extends Data.TaggedError("ApiRequestFailed")<{
  readonly detail: string;
  readonly url: string;
}> {
  override get [CliError.userMessage]() {
    return [
      `The Peal API at ${this.url} did not answer as expected (${this.detail}).`,
      "  Check that the server is running, or point --api-url or PEAL_API_URL at it.",
    ].join("\n");
  }
}

const decodeCause = Schema.decodeUnknownOption(
  Schema.Struct({ message: Schema.NonEmptyString })
);

/** The failure of a request to the API at `url`, as the user reads it. */
export const requestFailed =
  (url: string) =>
  (error: HttpClientError.HttpClientError | Schema.SchemaError) => {
    if (error._tag === "SchemaError") {
      return new ApiRequestFailed({
        detail: `unexpected answer: ${error.message}`,
        url,
      });
    }

    // Fetch rejects with the system's reason (ECONNREFUSED, ENOTFOUND…),
    // which says more than the request line the client error carries.
    const detail =
      error.response === undefined
        ? Option.match(decodeCause(error.cause), {
            onNone: () => error.message,
            onSome: ({ message }) => message,
          })
        : `HTTP ${String(error.response.status)}`;

    return new ApiRequestFailed({ detail, url });
  };
