import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Clock, DateTime, Effect, Layer, Option, Ref } from "effect";
import { TestClock } from "effect/testing";

import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import { UsageStates } from "#billing/application/ports/usage-states.ts";
import type {
  UsageStatesRequest,
  WorkspaceDayState,
} from "#billing/application/ports/usage-states.ts";
import { SnapshotUsage } from "#billing/application/snapshot-usage.ts";
import type { UsageRecord, UsageState } from "#billing/domain/usage-meter.ts";
import { DrizzleUsageLedgerLive } from "#billing/infrastructure/drizzle-usage-ledger.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const yesterday = day("2026-11-10");

// Four workspaces made before today, one made today, in the order of ids.
const ids = Array.from({ length: 5 }, () =>
  WorkspaceIdSchema.make(randomUUID())
).toSorted();

const madeToday = ids[2] ?? WorkspaceIdSchema.make(randomUUID());

const existing = ids.filter((id) => id !== madeToday);

const createdAt = (id: WorkspaceId) =>
  id === madeToday
    ? DateTime.makeUnsafe("2026-11-11T00:05:00Z")
    : DateTime.makeUnsafe("2026-11-01T09:00:00Z");

// What every workspace holds: its place among them, as channels.
const stateOf = (id: WorkspaceId, added: number): WorkspaceDayState => ({
  assistantRequests: 3,
  channels: ids.indexOf(id) + added,
  mediaStorage: 9_000_000_000,
  members: 2,
  workspaceId: id,
});

// The pages asked for, and what the contexts add to each channel count.
const asked = Ref.makeUnsafe<readonly UsageStatesRequest[]>([]);

const extra = Ref.makeUnsafe(0);

// The workspaces as the contexts would page through them.
const StatesTest = Layer.succeed(
  UsageStates,
  UsageStates.of({
    page: (request) =>
      Effect.gen(function* page() {
        yield* Ref.update(asked, (all) => [...all, request]);
        const added = yield* Ref.get(extra);

        return ids
          .filter(
            (id) =>
              Option.match(request.after, {
                onNone: () => true,
                onSome: (after) => id > after,
              }) && DateTime.isLessThan(createdAt(id), request.createdBefore)
          )
          .slice(0, request.limit)
          .map((id) => stateOf(id, added));
      }),
  })
);

const SnapshotTest = SnapshotUsage.make(2).pipe(
  Layer.provide(StatesTest),
  Layer.provideMerge(DrizzleUsageLedgerLive),
  Layer.provideMerge(DatabaseTest)
);

const recordedOn = (on: DateTime.Utc) =>
  Effect.gen(function* recorded() {
    const ledger = yield* UsageLedger;

    return yield* Effect.all(
      ids.map((id) => ledger.ofWorkspace(id, { from: on, to: on }))
    );
  });

layer(SnapshotTest)("the daily usage snapshot", (it) => {
  it.effect(
    "writes yesterday's states of every workspace across batches, once whatever the runs, then purges",
    () =>
      Effect.gen(function* snapshots() {
        const snapshot = yield* SnapshotUsage;
        const ledger = yield* UsageLedger;
        const [first] = existing;

        assert.isDefined(first);

        // Past the 400 days the ledger keeps, at the first run.
        yield* ledger.set([
          {
            record: {
              day: day("2025-10-06"),
              dimension: "",
              meter: "channels",
              quantity: 1,
            },
            workspaceId: first,
          },
        ]);

        // A clock of the snapshot's own: moving the test's would wake every
        // sleep of the database pool's fibers for 56 years.
        const clock = yield* TestClock.make();

        yield* clock.setTime(
          DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-11T00:11:00Z"))
        );

        const runAt = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
          effect.pipe(Effect.provideService(Clock.Clock, clock));

        const run = yield* runAt(snapshot.run);

        assert.deepStrictEqual(run.day, yesterday);
        assert.strictEqual(run.workspaces, 4);
        assert.isAtLeast(run.purged, 1);
        assert.deepStrictEqual(
          (yield* Ref.get(asked)).map(({ after, createdBefore, limit }) => ({
            after,
            createdBefore,
            limit,
          })),
          [
            {
              after: Option.none(),
              createdBefore: day("2026-11-11"),
              limit: 2,
            },
            {
              after: Option.fromUndefinedOr(existing[1]),
              createdBefore: day("2026-11-11"),
              limit: 2,
            },
            {
              after: Option.fromUndefinedOr(existing[3]),
              createdBefore: day("2026-11-11"),
              limit: 2,
            },
          ]
        );

        const written = yield* recordedOn(yesterday);

        const stateRecord = (
          meter: UsageState,
          quantity: number
        ): UsageRecord => ({
          day: yesterday,
          dimension: "",
          meter,
          quantity,
        });

        const expected = ids.map((id) =>
          id === madeToday
            ? []
            : [
                stateRecord("assistantRequests", 3),
                stateRecord("channels", ids.indexOf(id)),
                stateRecord("mediaStorage", 9_000_000_000),
                stateRecord("members", 2),
              ]
        );

        assert.deepStrictEqual(written, expected);
        assert.lengthOf(
          yield* ledger.ofWorkspace(first, {
            from: day("2025-10-06"),
            to: day("2025-10-06"),
          }),
          0
        );

        // Run again: the same rows.
        const again = yield* runAt(snapshot.run);

        assert.strictEqual(again.workspaces, 4);
        assert.deepStrictEqual(yield* recordedOn(yesterday), expected);

        // A run later the same day writes the states as they are then.
        yield* Ref.set(extra, 10);
        yield* runAt(snapshot.run);

        const channels = (yield* recordedOn(yesterday)).map(
          (records) =>
            records.find(({ meter }) => meter === "channels")?.quantity
        );

        assert.deepStrictEqual(
          channels,
          ids.map((id, index) => (id === madeToday ? undefined : index + 10))
        );

        yield* Effect.all(ids.map((id) => ledger.eraseWorkspace(id)));
      })
  );
});
