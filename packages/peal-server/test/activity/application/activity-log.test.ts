import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Option } from "effect";
import type { Layer } from "effect";
import { TestClock } from "effect/testing";

import { ActivityLog } from "#activity/application/activity-log.ts";
import { ActivityRecords } from "#activity/application/activity-records.ts";
import type { Ids } from "#shared/application/ids.ts";
import {
  ActivityMemoryTest,
  ActivityTest,
  changeBy,
  firstPage,
  namedClient,
  namedKey,
} from "#test/activity/support.ts";
import { actorIn, freshWorkspace } from "#test/channels/support.ts";
import { freshUser } from "#test/notifications/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const tagOf = <E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<unknown, E, R>
): Effect.Effect<string, never, R> =>
  effect.pipe(
    Effect.match({
      onFailure: (failure) => failure._tag,
      onSuccess: () => "succeeded",
    })
  );

// A minute of its own, long before the test clock's own start (1970) and
// any other suite's rows: the purge ends every workspace's retention, and
// moving the clock back runs none of the sleeps the database pool waits on.
const startOfTest = Effect.sync(
  () => Date.UTC(1900, 0, 1) + Math.floor(Math.random() * 1e6) * 60_000
);

const logSuite = (
  store: string,
  services: Layer.Layer<ActivityLog | ActivityRecords | Ids, unknown>
) => {
  layer(services)(`a workspace's activity log, ${store}`, (it) => {
    it.effect(
      "keeps who asked, through which application, and how it was answered",
      () =>
        Effect.gen(function* records() {
          const log = yield* ActivityLog;
          const workspaceId = yield* freshWorkspace;
          const userId = yield* freshUser;
          const now = yield* DateTime.now;

          const inPerson = yield* log.record(
            changeBy(workspaceId, userId, {
              named: {
                note: "A synthetic sentence someone wrote.",
                postId: "0195d2c0-0000-7000-8000-000000000001",
                workspaceId,
              },
              operation: "posts.schedule",
              requestId: Option.some("activity-test-0001"),
              status: Option.some(200),
            })
          );

          const byKey = yield* log.record(
            changeBy(workspaceId, userId, {
              actor: { _tag: "apiKey", apiKeyId: namedKey },
              errorCode: Option.some("forbidden"),
              status: Option.some(403),
              via: "apiKey",
            })
          );

          const byUnnamedKey = yield* log.record(
            changeBy(workspaceId, userId, {
              actor: { _tag: "apiKey", apiKeyId: "synthetic-unnamed-key" },
              via: "apiKey",
            })
          );

          const byClient = yield* log.record(
            changeBy(workspaceId, userId, {
              clientId: Option.some(namedClient),
              impersonated: false,
              operation: "mcp.create_draft",
              status: Option.none(),
              via: "mcp",
            })
          );

          assert.deepStrictEqual(
            {
              actor: inPerson.actor,
              application: inPerson.application,
              errorCode: inPerson.errorCode,
              impersonated: inPerson.impersonated,
              objectIds: inPerson.objectIds,
              occurredAt: inPerson.occurredAt,
              operation: inPerson.operation,
              requestId: inPerson.requestId,
              status: inPerson.status,
              via: inPerson.via,
              workspaceId: inPerson.workspaceId,
            },
            {
              actor: { _tag: "user", userId: Option.some(userId) },
              application: Option.none(),
              errorCode: Option.none(),
              impersonated: false,
              // The sentence is not an id, and the workspace is kept apart.
              objectIds: { postId: "0195d2c0-0000-7000-8000-000000000001" },
              occurredAt: now,
              operation: "posts.schedule",
              requestId: Option.some("activity-test-0001"),
              status: Option.some(200),
              via: "session",
              workspaceId,
            }
          );
          assert.deepStrictEqual(
            [byKey.application, byKey.errorCode, byKey.status],
            [
              Option.some({
                id: namedKey,
                name: Option.some("Synthetic key"),
              }),
              Option.some("forbidden"),
              Option.some(403),
            ]
          );
          assert.deepStrictEqual(
            byUnnamedKey.application,
            Option.some({ id: "synthetic-unnamed-key", name: Option.none() })
          );
          assert.deepStrictEqual(
            [byClient.application, byClient.status, byClient.via],
            [
              Option.some({
                id: namedClient,
                name: Option.some("Synthetic client"),
              }),
              Option.none(),
              "mcp",
            ]
          );

          // What was kept reads back the same.
          const owner = actorIn(workspaceId, permissionsFor("owner"));
          const listed = yield* log.list(owner, firstPage);

          assert.deepStrictEqual(listed.items, [
            byClient,
            byUnnamedKey,
            byKey,
            inPerson,
          ]);
        })
    );

    it.effect("is read by owners alone", () =>
      Effect.gen(function* owners() {
        const log = yield* ActivityLog;
        const workspaceId = yield* freshWorkspace;

        yield* log.record(changeBy(workspaceId, yield* freshUser));

        for (const role of ["admin", "editor", "contributor", "viewer"]) {
          assert.strictEqual(
            yield* tagOf(
              log.list(actorIn(workspaceId, permissionsFor(role)), firstPage)
            ),
            "MissingPermission"
          );
        }

        const owner = actorIn(workspaceId, permissionsFor("owner"));

        assert.lengthOf((yield* log.list(owner, firstPage)).items, 1);
      })
    );

    it.effect(
      "lists a workspace's events newest first, a page at a time, and no other workspace's",
      () =>
        Effect.gen(function* pages() {
          const log = yield* ActivityLog;
          const workspaceId = yield* freshWorkspace;
          const neighbour = yield* freshWorkspace;
          const userId = yield* freshUser;
          const owner = actorIn(workspaceId, permissionsFor("owner"));

          const made = yield* Effect.forEach(
            ["posts.create", "posts.update", "posts.schedule"],
            (operation) =>
              log.record(changeBy(workspaceId, userId, { operation }))
          );

          yield* log.record(changeBy(neighbour, userId));

          const newest = made.map(({ id }) => id).toReversed();
          const first = yield* log.list(owner, { ...firstPage, limit: 2 });

          assert.deepStrictEqual(
            first.items.map(({ id }) => id),
            newest.slice(0, 2)
          );
          assert.deepStrictEqual(first.next, Option.fromUndefinedOr(newest[1]));

          const second = yield* log.list(owner, {
            ...firstPage,
            after: first.next,
            limit: 2,
          });

          assert.deepStrictEqual(
            second.items.map(({ id }) => id),
            newest.slice(2)
          );
          assert.isTrue(Option.isNone(second.next));
        })
    );

    it.effect("keeps one operation, or what one member or key asked for", () =>
      Effect.gen(function* filters() {
        const log = yield* ActivityLog;
        const workspaceId = yield* freshWorkspace;
        const ana = yield* freshUser;
        const ben = yield* freshUser;
        const owner = actorIn(workspaceId, permissionsFor("owner"));

        const scheduled = yield* log.record(
          changeBy(workspaceId, ana, { operation: "posts.schedule" })
        );

        const drafted = yield* log.record(changeBy(workspaceId, ben));

        const byKey = yield* log.record(
          changeBy(workspaceId, ana, {
            actor: { _tag: "apiKey", apiKeyId: namedKey },
            via: "apiKey",
          })
        );

        const idsOf = (filter: Partial<typeof firstPage>) =>
          log
            .list(owner, { ...firstPage, ...filter })
            .pipe(Effect.map(({ items }) => items.map(({ id }) => id)));

        assert.deepStrictEqual(
          yield* idsOf({ operation: Option.some("posts.schedule") }),
          [scheduled.id]
        );
        assert.deepStrictEqual(yield* idsOf({ actorId: Option.some(ben) }), [
          drafted.id,
        ]);
        assert.deepStrictEqual(
          yield* idsOf({ actorId: Option.some(namedKey) }),
          [byKey.id]
        );
        assert.deepStrictEqual(
          yield* idsOf({
            actorId: Option.some(ana),
            operation: Option.some("posts.create"),
          }),
          []
        );
        // An id that is no user's and no key's names nobody.
        assert.deepStrictEqual(
          yield* idsOf({ actorId: Option.some("nobody") }),
          []
        );
      })
    );

    it.effect("keeps an event 90 days", () =>
      Effect.gen(function* retention() {
        yield* TestClock.setTime(yield* startOfTest);

        const log = yield* ActivityLog;
        const workspaceId = yield* freshWorkspace;
        const userId = yield* freshUser;
        const owner = actorIn(workspaceId, permissionsFor("owner"));

        yield* log.record(changeBy(workspaceId, userId));
        yield* log.record(changeBy(workspaceId, userId));
        yield* TestClock.adjust("89 days");

        const later = yield* log.record(changeBy(workspaceId, userId));

        // Within the 90 days, the three are kept.
        yield* log.purge;

        assert.lengthOf((yield* log.list(owner, firstPage)).items, 3);

        yield* TestClock.adjust("2 days");

        assert.isAtLeast(yield* log.purge, 2);
        assert.deepStrictEqual(
          (yield* log.list(owner, firstPage)).items.map(({ id }) => id),
          [later.id]
        );
      })
    );
  });

  layer(services)(`what the activity logs keep, ${store}`, (it) => {
    it.effect("goes with its workspace, and no other's", () =>
      Effect.gen(function* erasure() {
        const log = yield* ActivityLog;
        const activity = yield* ActivityRecords;
        const workspaceId = yield* freshWorkspace;
        const neighbour = yield* freshWorkspace;
        const userId = yield* freshUser;

        yield* log.record(changeBy(workspaceId, userId));

        const kept = yield* log.record(changeBy(neighbour, userId));

        yield* activity.eraseWorkspace(workspaceId);

        assert.deepStrictEqual(
          (yield* log.list(
            actorIn(workspaceId, permissionsFor("owner")),
            firstPage
          )).items,
          []
        );
        assert.deepStrictEqual(
          (yield* log.list(
            actorIn(neighbour, permissionsFor("owner")),
            firstPage
          )).items,
          [kept]
        );
      })
    );

    it.effect(
      "forgets a user whose account closes, and keeps what they did as the workspace's",
      () =>
        Effect.gen(function* forgetting() {
          const log = yield* ActivityLog;
          const activity = yield* ActivityRecords;
          const workspaceId = yield* freshWorkspace;
          const ana = yield* freshUser;
          const ben = yield* freshUser;
          const owner = actorIn(workspaceId, permissionsFor("owner"));

          const hers = yield* log.record(
            changeBy(workspaceId, ana, {
              clientId: Option.some(namedClient),
              operation: "posts.schedule",
              via: "oauth",
            })
          );

          // Ben removed her from the workspace: the path named her.
          const his = yield* log.record(
            changeBy(workspaceId, ben, {
              named: { channelId: "mastodon", userId: ana },
              operation: "members.remove",
            })
          );

          yield* activity.forgetUser(ana);

          const [afterHis, afterHers] = (yield* log.list(owner, firstPage))
            .items;

          assert.deepStrictEqual(
            {
              actor: afterHers?.actor,
              application: afterHers?.application,
              id: afterHers?.id,
              operation: afterHers?.operation,
              via: afterHers?.via,
            },
            {
              actor: { _tag: "user", userId: Option.none() },
              application: Option.none(),
              id: hers.id,
              operation: "posts.schedule",
              via: "oauth",
            }
          );
          assert.deepStrictEqual(
            {
              actor: afterHis?.actor,
              id: afterHis?.id,
              objectIds: afterHis?.objectIds,
            },
            {
              actor: { _tag: "user", userId: Option.some(ben) },
              id: his.id,
              objectIds: { channelId: "mastodon" },
            }
          );
          assert.deepStrictEqual(yield* activity.exportUser(ana), []);
        })
    );

    it.effect("copies out what a user asked for, and nobody else's", () =>
      Effect.gen(function* exporting() {
        const log = yield* ActivityLog;
        const activity = yield* ActivityRecords;
        const workspaceId = yield* freshWorkspace;
        const other = yield* freshWorkspace;
        const ana = yield* freshUser;
        const ben = yield* freshUser;

        const first = yield* log.record(
          changeBy(workspaceId, ana, {
            named: { postId: "0195d2c0-0000-7000-8000-000000000001" },
            operation: "posts.schedule",
            requestId: Option.some("activity-test-0002"),
            status: Option.some(200),
          })
        );

        const second = yield* log.record(
          changeBy(other, ana, {
            clientId: Option.some(namedClient),
            operation: "mcp.create_draft",
            status: Option.none(),
            via: "mcp",
          })
        );

        yield* log.record(changeBy(workspaceId, ben));
        yield* log.record(
          changeBy(workspaceId, ana, {
            actor: { _tag: "apiKey", apiKeyId: namedKey },
            via: "apiKey",
          })
        );

        assert.deepStrictEqual(yield* activity.exportUser(ana), [
          {
            at: first.occurredAt,
            operation: "posts.schedule",
            status: 200,
            via: "session",
            workspaceId,
          },
          {
            at: second.occurredAt,
            operation: "mcp.create_draft",
            status: null,
            via: "mcp",
            workspaceId: other,
          },
        ]);
      })
    );
  });
};

logSuite("in memory", ActivityMemoryTest);

logSuite("on Postgres", ActivityTest);
