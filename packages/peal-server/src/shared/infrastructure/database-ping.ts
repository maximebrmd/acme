import { Duration, Effect, Fiber } from "effect";
import { SqlClient } from "effect/sql";

// A database that takes longer than this to answer counts as unreachable, so
// probes get an answer before they give up.
export const pingTimeout = Duration.seconds(2);

/**
 * Asks the database for `SELECT 1`, within `pingTimeout`: what readiness
 * means for GET /api/ready, the MCP server's health tool and the staff
 * console's system page.
 *
 * The driver takes up to five more seconds to cancel a query cut short, so
 * the query runs on a fiber of its own, interrupted in the background, and
 * the answer does not wait for the cancellation.
 */
export const makeDatabasePing = Effect.gen(function* makeDatabasePing() {
  const sql = yield* SqlClient.SqlClient;

  return Effect.gen(function* pingDatabase() {
    const ping = yield* Effect.forkDetach(sql`SELECT 1`);

    yield* Fiber.join(ping).pipe(
      Effect.timeout(pingTimeout),
      Effect.onError(() => Effect.forkDetach(Fiber.interrupt(ping)))
    );
  });
});
