import { Console, Data, Duration, Effect, Option, Schema } from "effect";
import { CliError, Command } from "effect/cli";
import type { HttpClientError } from "effect/http";

import { AcmeApi } from "#api.ts";
import { display } from "#display.ts";

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
          `Cannot reach the Acme API at ${this.url} (${this.detail}).`,
          "  Check that the server is running, or point --api-url or ACME_API_URL at it.",
        ].join("\n")
      : `The Acme API at ${this.url} is not healthy (${this.detail}).`;
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
  {},
  Effect.fn("health")(function* health() {
    const { baseUrl, client } = yield* AcmeApi;
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

    yield* Console.log(
      `The Acme API at ${url} is healthy (${String(milliseconds)} ms).`
    );
  })
).pipe(
  Command.withDescription(
    "Check that the Acme API answers. Exits with 1 when it is unreachable or unhealthy."
  )
);
