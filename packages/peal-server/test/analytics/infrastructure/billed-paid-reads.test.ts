import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";

import { PaidReads } from "#analytics/application/paid-reads.ts";
import { billedPaidReads } from "#analytics/infrastructure/billed-paid-reads.ts";
import { XPassThrough } from "#billing/application/x-pass-through.ts";
import { rateCard } from "#billing/domain/rate-card.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { FakeMetersLedger, fakeMeters } from "#test/shared/support.ts";

// X's reads on a server that bills: only for a workspace that turned them
// on, each new resource of the day claiming X's rate on the `xApi` meter.

const { postRead, userRead } = rateCard.x.rates;

// Reads turned on for the workspaces in `on`.
const readsFor = (on: Ref.Ref<ReadonlySet<WorkspaceId>>) =>
  Layer.succeed(
    XPassThrough,
    XPassThrough.of({
      rates: rateCard.x.rates,
      readsOf: () => Effect.succeedNone,
      readsOn: (workspaceId) =>
        Ref.get(on).pipe(Effect.map((all) => all.has(workspaceId))),
      setReads: () => Effect.die("not set in this test"),
    })
  );

const turnedOn = Ref.makeUnsafe<ReadonlySet<WorkspaceId>>(new Set());

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM analytics.paid_reads WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.orDie);

const claiming = (workspaceId: WorkspaceId, resources: readonly string[]) =>
  PaidReads.use((paid) =>
    paid.claim({ platform: "x", resources, workspaceId })
  );

const turnOn = (workspaceId: WorkspaceId) =>
  Ref.update(turnedOn, (all) => new Set([...all, workspaceId]));

const units = FakeMetersLedger.use(Ref.get).pipe(
  Effect.map(({ claims }) => claims.map((claim) => claim.units))
);

// Room on the meter for two posts and a user, as a ceiling would leave.
const room = 2 * postRead + userRead;

layer(
  billedPaidReads.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        readsFor(turnedOn),
        fakeMeters({ allowed: Option.some(room) })
      )
    ),
    Layer.provideMerge(DatabaseTest)
  ),
  { excludeTestServices: true }
)("X's reads on a server that bills", (it) => {
  it.effect("reads nothing for a workspace that did not turn them on", () =>
    Effect.gen(function* off() {
      const workspaceId = yield* freshWorkspace;

      yield* Effect.gen(function* checks() {
        assert.deepStrictEqual(yield* claiming(workspaceId, ["1", "2"]), []);
        assert.deepStrictEqual(yield* units, []);
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );

  it.effect(
    "claims X's rate for each new resource of the day, once, and leaves what the ceiling does not pay for unread",
    () =>
      Effect.gen(function* on() {
        const workspaceId = yield* freshWorkspace;

        yield* turnOn(workspaceId);

        yield* Effect.gen(function* checks() {
          assert.deepStrictEqual(
            yield* claiming(workspaceId, ["1", "user:9"]),
            ["1", "user:9"]
          );
          assert.deepStrictEqual(yield* units, [postRead + userRead]);

          // The same post again today costs nothing more; of the new ones,
          // the ceiling pays for one.
          assert.deepStrictEqual(
            yield* claiming(workspaceId, ["1", "2", "3"]),
            ["1", "2"]
          );
          assert.deepStrictEqual(yield* units, [postRead + userRead, postRead]);

          // Nothing left: the read of a new post waits, one read today does not.
          assert.deepStrictEqual(yield* claiming(workspaceId, ["3", "2"]), [
            "2",
          ]);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      })
  );
});
