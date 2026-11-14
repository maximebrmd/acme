import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { PaidReads } from "#analytics/application/paid-reads.ts";
import { sqlPaidReadsWith } from "#analytics/infrastructure/sql-paid-reads.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The meter of reads a platform bills, on Postgres: three resources a
// workspace and a day.

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM analytics.paid_reads WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.orDie);

const claiming = (workspaceId: WorkspaceId, resources: readonly string[]) =>
  PaidReads.use((paid) =>
    paid.claim({ platform: "x", resources, workspaceId })
  ).pipe(Effect.map((covered) => covered.resources));

layer(sqlPaidReadsWith(3).pipe(Layer.provideMerge(DatabaseTest)), {
  excludeTestServices: true,
})("reads a platform bills", (it) => {
  it.effect(
    "covers a day's allowance, counts a resource once a day, and starts over the next day",
    () =>
      Effect.gen(function* metered() {
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;

        yield* Effect.gen(function* checks() {
          assert.deepStrictEqual(yield* claiming(workspaceId, ["1", "2"]), [
            "1",
            "2",
          ]);

          // One read again is free; of the new ones, one more is covered.
          assert.deepStrictEqual(
            yield* claiming(workspaceId, ["2", "3", "4", "1"]),
            ["2", "3", "1"]
          );
          assert.deepStrictEqual(yield* claiming(workspaceId, ["5"]), []);

          // Another workspace has its own allowance.
          assert.deepStrictEqual(yield* claiming(other, ["5"]), ["5"]);

          // The next day: what was read is yesterday's.
          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`UPDATE analytics.paid_reads SET day = day - 1 WHERE workspace_id = ${workspaceId}`
          ).pipe(Effect.orDie);

          assert.deepStrictEqual(yield* claiming(workspaceId, ["5", "1"]), [
            "5",
            "1",
          ]);
        }).pipe(
          Effect.ensuring(Effect.all([forget(workspaceId), forget(other)]))
        );
      })
  );

  it.effect("never passes the allowance when claims come together", () =>
    Effect.gen(function* together() {
      const workspaceId = yield* freshWorkspace;

      yield* Effect.gen(function* checks() {
        const covered = yield* Effect.forEach(
          ["a", "b", "c", "d", "e", "f"],
          (resource) => claiming(workspaceId, [resource]),
          { concurrency: "unbounded" }
        );

        assert.lengthOf(covered.flat(), 3);
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );
});
