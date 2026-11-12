import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";

import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import type { UsageRecord } from "#billing/domain/usage-meter.ts";
import { DrizzleUsageLedgerLive } from "#billing/infrastructure/drizzle-usage-ledger.ts";
import {
  DatabaseTest,
  freshWorkspace,
  pastParameterLimit,
} from "#test/channels/support.ts";

const LedgerTest = DrizzleUsageLedgerLive.pipe(
  Layer.provideMerge(DatabaseTest)
);

const day = (written: string) => DateTime.makeUnsafe(`${written}T00:00:00Z`);

const posts = (
  on: string,
  quantity = 1,
  platform: "bluesky" | "x" = "x"
): UsageRecord => ({
  day: day(on),
  dimension: platform,
  meter: "publishedPosts",
  quantity,
});

const channels = (on: string, quantity: number): UsageRecord => ({
  day: day(on),
  dimension: "",
  meter: "channels",
  quantity,
});

const period = { from: day("2026-10-01"), to: day("2026-10-31") };

layer(LedgerTest)("the usage ledger in Postgres", (it) => {
  it.effect("adds to a day's count, twice as two", () =>
    Effect.gen(function* adds() {
      const ledger = yield* UsageLedger;
      const workspaceId = yield* freshWorkspace;

      yield* ledger.add({ record: posts("2026-10-05"), workspaceId });
      yield* ledger.add({ record: posts("2026-10-05", 2), workspaceId });
      yield* ledger.add({
        record: posts("2026-10-05", 1, "bluesky"),
        workspaceId,
      });

      assert.deepStrictEqual(yield* ledger.ofWorkspace(workspaceId, period), [
        posts("2026-10-05", 1, "bluesky"),
        posts("2026-10-05", 3),
      ]);

      // Every day, for the workspace's export.
      yield* ledger.add({ record: posts("2025-12-31"), workspaceId });

      assert.deepStrictEqual(yield* ledger.allOf(workspaceId), [
        posts("2025-12-31"),
        posts("2026-10-05", 1, "bluesky"),
        posts("2026-10-05", 3),
      ]);

      yield* ledger.eraseWorkspace(workspaceId);
    })
  );

  it.effect("counts fifty adds sent together as fifty", () =>
    Effect.gen(function* together() {
      const ledger = yield* UsageLedger;
      const workspaceId = yield* freshWorkspace;

      yield* Effect.all(
        Array.from({ length: 50 }, () =>
          ledger.add({ record: posts("2026-10-06"), workspaceId })
        ),
        { concurrency: "unbounded" }
      );

      assert.deepStrictEqual(yield* ledger.ofWorkspace(workspaceId, period), [
        posts("2026-10-06", 50),
      ]);

      yield* ledger.eraseWorkspace(workspaceId);
    })
  );

  it.effect("replaces a day's state, and reads only the period's days", () =>
    Effect.gen(function* replaces() {
      const ledger = yield* UsageLedger;
      const workspaceId = yield* freshWorkspace;
      const other = yield* freshWorkspace;

      yield* ledger.set([
        { record: channels("2026-10-07", 4), workspaceId },
        { record: channels("2026-10-07", 9), workspaceId: other },
        { record: channels("2026-11-01", 4), workspaceId },
      ]);
      yield* ledger.set([{ record: channels("2026-10-07", 2), workspaceId }]);
      yield* ledger.set([]);

      assert.deepStrictEqual(yield* ledger.ofWorkspace(workspaceId, period), [
        channels("2026-10-07", 2),
      ]);
      assert.deepStrictEqual(yield* ledger.ofWorkspace(other, period), [
        channels("2026-10-07", 9),
      ]);

      yield* ledger.eraseWorkspace(workspaceId);

      assert.lengthOf(
        yield* ledger.ofWorkspace(workspaceId, {
          from: day("2026-01-01"),
          to: day("2026-12-31"),
        }),
        0
      );
      assert.lengthOf(yield* ledger.ofWorkspace(other, period), 1);

      yield* ledger.eraseWorkspace(other);
    })
  );

  it.effect("purges the days before a day", () =>
    Effect.gen(function* purges() {
      const ledger = yield* UsageLedger;
      const workspaceId = yield* freshWorkspace;

      // Days no other test of the suite writes: after the days the usage
      // snapshot's test has its daily purge delete, before the days the
      // other tests count, as files run at the same time.
      yield* ledger.add({ record: posts("2026-01-01"), workspaceId });
      yield* ledger.add({ record: posts("2026-01-02"), workspaceId });
      yield* ledger.set([{ record: channels("2026-01-02", 1), workspaceId }]);

      const purged = yield* ledger.purgeBefore(day("2026-01-02"));

      assert.isAtLeast(purged, 1);
      assert.deepStrictEqual(
        yield* ledger.ofWorkspace(workspaceId, {
          from: day("2026-01-01"),
          to: day("2026-01-31"),
        }),
        [channels("2026-01-02", 1), posts("2026-01-02")]
      );

      yield* ledger.eraseWorkspace(workspaceId);
    })
  );

  it.effect(
    "reads the period's records of several workspaces in one query, and nothing for none",
    () =>
      Effect.gen(function* several() {
        const ledger = yield* UsageLedger;
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        // Another partner's tenant, whose rows never come with the others.
        const stranger = yield* freshWorkspace;

        yield* ledger.add({
          record: posts("2026-10-08", 2),
          workspaceId: first,
        });
        yield* ledger.add({
          record: posts("2026-10-08", 1, "bluesky"),
          workspaceId: second,
        });
        yield* ledger.add({
          record: posts("2026-10-08", 5),
          workspaceId: second,
        });
        yield* ledger.add({ record: posts("2026-11-02"), workspaceId: first });
        yield* ledger.add({
          record: posts("2026-10-08", 7),
          workspaceId: stranger,
        });
        yield* ledger.set([
          { record: channels("2026-10-08", 3), workspaceId: first },
          { record: channels("2026-10-08", 4), workspaceId: second },
          { record: channels("2026-10-08", 8), workspaceId: stranger },
        ]);

        assert.deepStrictEqual(yield* ledger.ofWorkspaces([], period), []);

        const read = yield* ledger.ofWorkspaces([first, second], period);

        assert.sameDeepMembers(
          [...read],
          [
            { record: channels("2026-10-08", 3), workspaceId: first },
            { record: posts("2026-10-08", 2), workspaceId: first },
            { record: channels("2026-10-08", 4), workspaceId: second },
            { record: posts("2026-10-08", 1, "bluesky"), workspaceId: second },
            { record: posts("2026-10-08", 5), workspaceId: second },
          ]
        );

        // The posts of them all, summed by day and platform.
        assert.deepStrictEqual(yield* ledger.postsAcross([], period), []);
        assert.deepStrictEqual(
          yield* ledger.postsAcross([first, second], period),
          [posts("2026-10-08", 1, "bluesky"), posts("2026-10-08", 7)]
        );

        for (const workspaceId of [first, second, stranger]) {
          yield* ledger.eraseWorkspace(workspaceId);
        }
      })
  );

  it.effect("reads more workspaces than a statement takes parameters", () =>
    Effect.gen(function* many() {
      const ledger = yield* UsageLedger;
      const workspaceId = yield* freshWorkspace;

      yield* ledger.add({ record: posts("2026-10-09", 3), workspaceId });

      const ids = pastParameterLimit([workspaceId]);

      assert.deepStrictEqual(yield* ledger.ofWorkspaces(ids, period), [
        { record: posts("2026-10-09", 3), workspaceId },
      ]);
      assert.deepStrictEqual(yield* ledger.postsAcross(ids, period), [
        posts("2026-10-09", 3),
      ]);

      yield* ledger.eraseWorkspace(workspaceId);
    })
  );
});
