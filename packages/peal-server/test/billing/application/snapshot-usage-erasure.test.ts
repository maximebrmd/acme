import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Clock, DateTime, Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";

import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import { UsageStates } from "#billing/application/ports/usage-states.ts";
import type { WorkspaceDayState } from "#billing/application/ports/usage-states.ts";
import { SnapshotUsage } from "#billing/application/snapshot-usage.ts";
import { StartAccountDays } from "#billing/application/start-account-days.ts";
import { DrizzleUsageLedgerLive } from "#billing/infrastructure/drizzle-usage-ledger.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { AloneInAccountsTest } from "#test/billing/support.ts";
import { DatabaseTest } from "#test/channels/support.ts";

// The snapshot against erasure: a workspace erased while its batch is
// written keeps no row, and the purge of old rows runs even on a day the
// states cannot be read.

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const yesterday = day("2026-11-10");

const [first, second] = [
  WorkspaceIdSchema.make(randomUUID()),
  WorkspaceIdSchema.make(randomUUID()),
];

// In the order of their ids, as the snapshot pages.
const [kept, erased] = first < second ? [first, second] : [second, first];

const stateOf = (workspaceId: WorkspaceId): WorkspaceDayState => ({
  assistantRequests: 1,
  channels: 1,
  mediaStorage: 0,
  members: 1,
  workspaceId,
});

// Both workspaces are read, then one is erased before the rows are back.
const ErasedMeanwhile = Layer.succeed(
  UsageStates,
  UsageStates.of({
    page: ({ after }) =>
      Effect.succeed(Option.isNone(after) ? [kept, erased].map(stateOf) : []),
    workspaces: ({ after }) =>
      Effect.succeed(Option.isNone(after) ? [kept] : []),
  })
);

// The states cannot be read at all.
const Unreadable = Layer.succeed(
  UsageStates,
  UsageStates.of({
    page: () => Effect.fail(new DatabaseError({ cause: "synthetic" })),
    workspaces: () => Effect.fail(new DatabaseError({ cause: "synthetic" })),
  })
);

// No billing account's day to start, nor any to purge.
const NoAccountDaysTest = Layer.mergeAll(
  Layer.succeed(
    StartAccountDays,
    StartAccountDays.of({
      pooledOf: () => Effect.succeed(0),
      raiseAccount: () => Effect.void,
      run: Effect.succeed({ accounts: 0, started: 0 }),
    })
  ),
  Layer.mock(AccountDayStore, { purgeBefore: () => Effect.succeed(0) })
);

const snapshotOn = (states: typeof ErasedMeanwhile) =>
  SnapshotUsage.make(10).pipe(
    Layer.provide(
      Layer.mergeAll(states, AloneInAccountsTest, NoAccountDaysTest)
    ),
    Layer.provideMerge(DrizzleUsageLedgerLive),
    Layer.provideMerge(DatabaseTest)
  );

// The run, at 00:11 UTC on 11 November, on a clock of its own.
const runAtMidnight = Effect.gen(function* runAtMidnight() {
  const snapshot = yield* SnapshotUsage;
  const clock = yield* TestClock.make();

  yield* clock.setTime(
    DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-11T00:11:00Z"))
  );

  return yield* snapshot.run.pipe(
    Effect.provideService(Clock.Clock, clock),
    Effect.exit
  );
});

const rowsOf = (workspaceId: WorkspaceId, from: DateTime.Utc) =>
  UsageLedger.use((ledger) =>
    ledger.ofWorkspace(workspaceId, { from, to: from })
  );

layer(snapshotOn(ErasedMeanwhile))(
  "a workspace erased during the snapshot",
  (it) => {
    it.effect("keeps no row of it", () =>
      Effect.gen(function* erasedMeanwhile() {
        const run = yield* runAtMidnight;

        assert.strictEqual(run._tag, "Success");
        assert.lengthOf(yield* rowsOf(kept, yesterday), 4);
        assert.lengthOf(yield* rowsOf(erased, yesterday), 0);

        yield* UsageLedger.use((ledger) => ledger.eraseWorkspace(kept));
      })
    );
  }
);

layer(snapshotOn(Unreadable))(
  "a snapshot that cannot read the states",
  (it) => {
    it.effect("fails, and still deletes the rows past their days", () =>
      Effect.gen(function* unreadable() {
        const old = day("2025-10-06");

        yield* UsageLedger.use((ledger) =>
          ledger.set([
            {
              record: {
                day: old,
                dimension: "",
                meter: "channels",
                quantity: 1,
              },
              workspaceId: kept,
            },
          ])
        );

        const run = yield* runAtMidnight;

        assert.strictEqual(run._tag, "Failure");
        assert.lengthOf(yield* rowsOf(kept, old), 0);
      })
    );
  }
);
