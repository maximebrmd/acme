import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";

import { MeteredPostLedger } from "#billing/application/ports/metered-post-ledger.ts";
import { DrizzleMeteredPostLedgerLive } from "#billing/infrastructure/drizzle-metered-post-ledger.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

const LedgerTest = DrizzleMeteredPostLedgerLive.pipe(
  Layer.provideMerge(DatabaseTest)
);

const october = DateTime.makeUnsafe("2026-10-01T00:00:00Z");

const november = DateTime.makeUnsafe("2026-11-01T00:00:00Z");

layer(LedgerTest)("the metered posts' counts in Postgres", (it) => {
  it.effect(
    "add up each month's posts and those with a link, posts sent together too",
    () =>
      Effect.gen(function* counts() {
        const ledger = yield* MeteredPostLedger;
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;

        yield* Effect.all(
          [
            { month: november, withLink: true },
            { month: november, withLink: false },
            { month: november, withLink: true },
            { month: october, withLink: false },
          ].map(({ month, withLink }) =>
            ledger.add({ month, platform: "x", withLink, workspaceId })
          ),
          { concurrency: "unbounded" }
        );
        yield* ledger.add({
          month: november,
          platform: "x",
          withLink: true,
          workspaceId: other,
        });

        assert.deepStrictEqual(yield* ledger.ofWorkspace(workspaceId), [
          { month: october, platform: "x", posts: 1, postsWithLinks: 0 },
          { month: november, platform: "x", posts: 3, postsWithLinks: 2 },
        ]);

        yield* ledger.eraseWorkspace(workspaceId);

        assert.lengthOf(yield* ledger.ofWorkspace(workspaceId), 0);
        assert.lengthOf(yield* ledger.ofWorkspace(other), 1);
        yield* ledger.eraseWorkspace(other);
      })
  );
});
