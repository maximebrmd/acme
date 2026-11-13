import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { AnalyticsLive } from "#analytics/container.ts";
import { DigestSources } from "#notifications/application/digest-sources.ts";
import { PreferenceStore } from "#notifications/application/preference-store.ts";
import { digestWeekOf } from "#notifications/domain/weekly-digest.ts";
import { ContextDigestSources } from "#notifications/infrastructure/context-digest-sources.ts";
import { DrizzlePreferenceStore } from "#notifications/infrastructure/drizzle-preference-store.ts";
import { PostAttentionLive } from "#publishing/container.ts";
import { newId } from "#shared/application/ids.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { freshUser } from "#test/notifications/support.ts";
import { ActorsNow } from "#workspace/application/actors-now.ts";
import type { ActorStanding } from "#workspace/application/actors-now.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { Account } from "#workspace/domain/account.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// What the weekly digest reads, on Postgres: the posts publishing keeps and
// analytics' engagement, for the workspaces a member stands in as the
// workspace context decides it (here a directory and standings the test
// sets), and who asked for it. Posts are in 2054, an instant no other
// suite uses, and deleted after.

interface Membership {
  readonly name: string;
  readonly standing: (
    userId: UserId,
    workspaceId: WorkspaceId
  ) => ActorStanding;
  readonly workspaceId: WorkspaceId;
}

const memberships = new Map<UserId, readonly Membership[]>();

const DirectoryTest = Layer.succeed(
  MemberDirectory,
  MemberDirectory.of({
    account: (userId) =>
      Effect.succeed(
        Option.fromUndefinedOr(memberships.get(userId)).pipe(
          Option.map(
            (workspaces) =>
              new Account({
                ban: Option.none(),
                email: `digest+${userId}@example.test`,
                emailVerified: true,
                id: userId,
                image: Option.none(),
                locale: "fr",
                name: "Synthetic reader",
                twoStepEnabled: false,
                workspaces: workspaces.map(({ name, workspaceId }) => ({
                  id: workspaceId,
                  name,
                  role: "member",
                  slug: name.toLowerCase(),
                })),
              })
          )
        )
      ),
    membership: () => Effect.die("not read by the digest"),
    memberships: () => Effect.die("not read by the digest"),
  })
);

const StandingsTest = Layer.succeed(
  ActorsNow,
  ActorsNow.of({
    ofApplication: () => Effect.die("not read by the digest"),
    ofKey: () => Effect.die("not read by the digest"),
    ofMember: (userId, workspaceId) =>
      Effect.succeed(
        memberships
          .get(userId)
          ?.find((membership) => membership.workspaceId === workspaceId)
          ?.standing(userId, workspaceId) ?? { _tag: "gone" }
      ),
  })
);

const acting =
  (permissions: readonly Permission[]) =>
  (userId: UserId, workspaceId: WorkspaceId): ActorStanding => ({
    _tag: "acting",
    actor: new Actor({
      permissions,
      subject: { _tag: "user", impersonatedBy: Option.none(), userId },
      workspaceId,
    }),
  });

const SourcesTest = Layer.mergeAll(
  ContextDigestSources,
  DrizzlePreferenceStore
).pipe(
  Layer.provide(
    Layer.mergeAll(
      DirectoryTest,
      StandingsTest,
      PostAttentionLive,
      AnalyticsLive
    )
  ),
  Layer.provideMerge(DatabaseTest)
);

// Monday 13 October 2054: the week of 6 October.
const week = digestWeekOf(DateTime.makeUnsafe("2054-10-13T06:19:00Z"));

const insertPost = Effect.fn("insertPost")(function* insertPost(
  workspaceId: WorkspaceId,
  status: string,
  at: string,
  outcome?: string
) {
  const sql = yield* SqlClient.SqlClient;
  const postId = yield* newId(PostIdSchema);
  const instant = new Date(at);

  yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text, scheduled_at, schedule_zone, finished_at, outcome) VALUES (${postId}, ${workspaceId}, ${status}, ${`A synthetic post at ${at}`}, ${instant}, 'UTC', ${outcome === undefined ? null : instant}, ${outcome ?? null})`;
});

const deletePosts = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM publishing.posts WHERE workspace_id IN ${sql.in(workspaceIds)}`
  ).pipe(Effect.orDie);

layer(SourcesTest)("the weekly digest's sources on Postgres", (it) => {
  it.effect(
    "tell the week of each workspace whose posts the member may read, engagement where they may read analytics",
    () =>
      Effect.gen(function* sources() {
        const userId = yield* freshUser;
        const editing = yield* freshWorkspace;
        const viewing = yield* freshWorkspace;
        const left = yield* freshWorkspace;
        const unread = yield* freshWorkspace;

        memberships.set(userId, [
          {
            name: "Editing",
            standing: acting(permissionsFor("editor")),
            workspaceId: editing,
          },
          {
            name: "Viewing",
            standing: acting(["post:read"]),
            workspaceId: viewing,
          },
          {
            name: "Left",
            standing: () => ({ _tag: "gone" }),
            workspaceId: left,
          },
          {
            name: "Unread",
            standing: acting(["channel:read"]),
            workspaceId: unread,
          },
        ]);

        for (const workspaceId of [editing, viewing, left, unread]) {
          yield* insertPost(
            workspaceId,
            "finished",
            "2054-10-07T09:00:00Z",
            "published"
          );
        }

        yield* insertPost(editing, "scheduled", "2054-10-14T09:00:00Z");

        const found = yield* DigestSources.use((digest) =>
          digest.readerOf(userId, week)
        ).pipe(Effect.ensuring(deletePosts([editing, viewing, left, unread])));

        assert.isTrue(Option.isSome(found));

        const reader = Option.getOrThrow(found);

        assert.strictEqual(reader.email, `digest+${userId}@example.test`);
        assert.strictEqual(reader.locale, "fr");
        assert.deepStrictEqual(
          reader.workspaces.map(({ name }) => name),
          ["Editing", "Viewing"]
        );

        const [first, second] = reader.workspaces;

        assert.isDefined(first);
        assert.isDefined(second);
        assert.deepStrictEqual(first.counts, {
          awaitingApproval: 0,
          failed: 0,
          scheduled: 1,
          unconfirmed: 0,
          wentOut: 1,
        });
        assert.deepStrictEqual(
          first.wentOut.map(({ excerpt }) => excerpt),
          ["A synthetic post at 2054-10-07T09:00:00Z"]
        );
        // Nothing analytics follows: engagement of none, impressions unknown.
        assert.deepStrictEqual(
          first.engagement,
          Option.some({ engagement: 0, impressions: Option.none() })
        );
        assert.isTrue(Option.isNone(second.engagement));
      })
  );

  it.effect("tell no reader for an account that is gone", () =>
    Effect.gen(function* gone() {
      const userId = yield* freshUser;

      assert.isTrue(
        Option.isNone(
          yield* DigestSources.use((digest) => digest.readerOf(userId, week))
        )
      );
    })
  );

  it.effect(
    "list those who asked for it, and claim each one's week once while they want it",
    () =>
      Effect.gen(function* claims() {
        const store = yield* PreferenceStore;
        const at = DateTime.makeUnsafe("2054-10-13T06:19:00Z");
        const asking = yield* freshUser;
        const never = yield* freshUser;

        yield* store.change(asking, { email: { weeklyDigest: true } }, at);
        yield* store.change(never, { email: { postPublished: true } }, at);

        const readers = yield* store.digestReaders({
          after: Option.none(),
          limit: 100_000,
        });

        assert.include(readers, asking);
        assert.notInclude(readers, never);
        assert.deepStrictEqual(
          readers,
          readers.toSorted(),
          "by id, the order pages follow"
        );

        // After the asking one, by id: never it again.
        assert.notInclude(
          yield* store.digestReaders({
            after: Option.some(asking),
            limit: 100_000,
          }),
          asking
        );

        assert.isTrue(yield* store.claimDigest(asking, week.from));
        assert.isFalse(yield* store.claimDigest(asking, week.from));
        assert.isFalse(yield* store.claimDigest(never, week.from));
        // The week after, once more.
        assert.isTrue(yield* store.claimDigest(asking, week.to));

        // Turned off: no claim, and no longer listed.
        yield* store.change(asking, { email: { weeklyDigest: false } }, at);

        assert.isFalse(yield* store.claimDigest(asking, week.until));
        assert.notInclude(
          yield* store.digestReaders({ after: Option.none(), limit: 100_000 }),
          asking
        );
      })
  );
});
