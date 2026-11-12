import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer } from "effect";

import { MeteredPostLedger } from "#billing/application/ports/metered-post-ledger.ts";
import { DrizzleMeteredPostLedgerLive } from "#billing/infrastructure/drizzle-metered-post-ledger.ts";
import {
  DatabaseTest,
  freshWorkspace,
  pastParameterLimit,
} from "#test/channels/support.ts";

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

  it.effect(
    "reads the months a period touches of several workspaces, and nothing for none",
    () =>
      Effect.gen(function* several() {
        const ledger = yield* MeteredPostLedger;
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const stranger = yield* freshWorkspace;
        const september = DateTime.makeUnsafe("2026-09-01T00:00:00Z");

        for (const [workspaceId, month] of [
          [first, september],
          [first, october],
          [second, november],
          [stranger, october],
        ] as const) {
          yield* ledger.add({
            month,
            platform: "x",
            withLink: true,
            workspaceId,
          });
        }

        const period = {
          from: DateTime.makeUnsafe("2026-10-20T00:00:00Z"),
          to: DateTime.makeUnsafe("2026-11-05T00:00:00Z"),
        };

        assert.deepStrictEqual(yield* ledger.ofWorkspaces([], period), []);
        assert.sameDeepMembers(
          [...(yield* ledger.ofWorkspaces([first, second], period))],
          [
            {
              count: {
                month: october,
                platform: "x",
                posts: 1,
                postsWithLinks: 1,
              },
              workspaceId: first,
            },
            {
              count: {
                month: november,
                platform: "x",
                posts: 1,
                postsWithLinks: 1,
              },
              workspaceId: second,
            },
          ]
        );

        for (const workspaceId of [first, second, stranger]) {
          yield* ledger.eraseWorkspace(workspaceId);
        }
      })
  );

  it.effect("reads more workspaces than a statement takes parameters", () =>
    Effect.gen(function* many() {
      const ledger = yield* MeteredPostLedger;
      const workspaceId = yield* freshWorkspace;

      yield* ledger.add({
        month: october,
        platform: "x",
        withLink: false,
        workspaceId,
      });

      assert.deepStrictEqual(
        yield* ledger.ofWorkspaces(pastParameterLimit([workspaceId]), {
          from: october,
          to: october,
        }),
        [
          {
            count: {
              month: october,
              platform: "x",
              posts: 1,
              postsWithLinks: 0,
            },
            workspaceId,
          },
        ]
      );

      yield* ledger.eraseWorkspace(workspaceId);
    })
  );
});
