import { Console, Data, Duration, Effect, Option, Schema } from "effect";
import { CliError, Command } from "effect/cli";
import type { HttpClientError } from "effect/http";

import type { JsonObject } from "#api-error.ts";
import { PealApi } from "#api.ts";
import { display } from "#display.ts";
import { jsonFlag, printDocument } from "#json.ts";

// A health check that hangs is as useless as one that fails.
export const healthTimeout = Duration.seconds(5);

// The check failed: the server is unreachable (refused connection, unknown
// host, timeout) or it answered, but not healthily (an error status or an
// unexpected body). The CLI renders `userMessage` and exits with 1.
//
// Data.TaggedError rather than Schema.TaggedError: this error is printed,
// never encoded, so it needs no schema.
export class HealthCheckFailed extends Data.TaggedError("HealthCheckFailed")<{
  readonly detail: string;
  readonly reason: "unhealthy" | "unreachable";
  readonly url: string;
}> {
  override get [CliError.userMessage]() {
    return this.reason === "unreachable"
      ? [
          `Cannot reach the Peal API at ${this.url} (${this.detail}).`,
          "  Check that the server is running, or point --api-url or PEAL_API_URL at it.",
        ].join("\n")
      : `The Peal API at ${this.url} is not healthy (${this.detail}).`;
  }

  /** What --json prints for it. */
  get jsonFailure(): JsonObject {
    return {
      code: this.reason,
      message:
        this.reason === "unreachable"
          ? `Cannot reach the Peal API at ${this.url} (${this.detail}).`
          : `The Peal API at ${this.url} is not healthy (${this.detail}).`,
    };
  }
}

const decodeCause = Schema.decodeUnknownOption(
  Schema.Struct({ message: Schema.NonEmptyString })
);

// Fetch rejects with the system's reason (ECONNREFUSED, ENOTFOUND…), which
// says more than the request line the client error carries.
const transportDetail = (error: HttpClientError.HttpClientError) =>
  Option.match(decodeCause(error.cause), {
    onNone: () => error.message,
    onSome: ({ message }) => message,
  });

export const health = Command.make(
  "health",
  { json: jsonFlag },
  Effect.fn("health")(function* health({ json }) {
    const { baseUrl, client } = yield* PealApi;
    const url = display(baseUrl);

    const fail = (reason: "unhealthy" | "unreachable", detail: string) =>
      Effect.fail(new HealthCheckFailed({ detail, reason, url }));

    const [elapsed] = yield* client.health().pipe(
      Effect.timeout(healthTimeout),
      Effect.timed,
      Effect.catchTags({
        HttpClientError: (error) =>
          error.response === undefined
            ? fail("unreachable", transportDetail(error))
            : fail("unhealthy", `HTTP ${String(error.response.status)}`),
        SchemaError: (error) =>
          fail("unhealthy", `unexpected answer: ${error.message}`),
        TimeoutError: () =>
          fail(
            "unreachable",
            `no answer within ${Duration.format(healthTimeout)}`
          ),
      })
    );

    const milliseconds = Math.round(Duration.toMillis(elapsed));

    // The API answers a health check without a body: --json says what the
    // command line measured.
    yield* json
      ? printDocument({ healthy: true, milliseconds, url })
      : Console.log(
          `The Peal API at ${url} is healthy (${String(milliseconds)} ms).`
        );
  })
).pipe(
  Command.withDescription(
    "Check that the Peal API answers. Exits with 1 when it is unreachable or unhealthy."
  )
);
