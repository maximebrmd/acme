import { Api, DatabaseUnavailable } from "acme-contract";
import { Duration, Effect, Fiber } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";

// A database that takes longer than this to answer counts as unreachable, so
// probes get an answer before they give up.
const readyTimeout = Duration.seconds(2);

export const SystemHandlers = HttpApiBuilder.group(
  Api,
  "system",
  Effect.fn(function* systemHandlers(handlers) {
    const sql = yield* SqlClient.SqlClient;

    // The driver takes up to five more seconds to cancel a query cut short, so
    // the query runs on a fiber of its own, interrupted in the background, and
    // the answer does not wait for the cancellation.
    const pingDatabase = Effect.gen(function* pingDatabase() {
      const ping = yield* Effect.forkDetach(sql`SELECT 1`);

      yield* Fiber.join(ping).pipe(
        Effect.timeout(readyTimeout),
        Effect.onError(() => Effect.forkDetach(Fiber.interrupt(ping)))
      );
    });

    return handlers.handleAll({
      health: () => Effect.void,
      ready: () =>
        pingDatabase.pipe(
          Effect.tapError((failure) =>
            Effect.logWarning("The database is unreachable", failure)
          ),
          Effect.mapError(() => new DatabaseUnavailable())
        ),
    });
  })
);
