import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Result } from "effect";
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
import { actorFor } from "#workspace/domain/membership.ts";
import type { Membership as WorkspaceMembership } from "#workspace/domain/membership.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

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

// How the workspace context decides a member in their own session now
// (`actorFor`), from their membership: a ban and two-step verification the
// workspace requires and the account lacks shut them out, as `ActorsNow`
// tells them.
const decided =
  (membership: WorkspaceMembership) =>
  (userId: UserId, workspaceId: WorkspaceId): ActorStanding =>
    Result.match(
      actorFor(
        new UserPrincipal({ impersonatedBy: Option.none(), userId }),
        workspaceId,
        Option.some(membership),
        DateTime.makeUnsafe("2054-10-13T06:19:00Z")
      ),
      {
        onFailure: (refusal): ActorStanding =>
          refusal._tag === "TwoStepRequired"
            ? { _tag: "lockedOut" }
            : { _tag: "gone" },
        onSuccess: (actor): ActorStanding => ({ _tag: "acting", actor }),
      }
    );

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
        const banned = yield* freshWorkspace;
        const strict = yield* freshWorkspace;

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
          {
            name: "Banned",
            standing: decided({
              ban: Option.some({ expiresAt: Option.none() }),
              role: "editor",
              twoStep: { enabled: false, required: false },
            }),
            workspaceId: banned,
          },
          {
            name: "Strict",
            standing: decided({
              ban: Option.none(),
              role: "editor",
              twoStep: { enabled: false, required: true },
            }),
            workspaceId: strict,
          },
        ]);

        const all = [editing, viewing, left, unread, banned, strict];

        for (const workspaceId of all) {
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
        ).pipe(Effect.ensuring(deletePosts(all)));

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
    "list those who asked for it and are still to have the week's, and mark a week sent only once it went",
    () =>
      Effect.gen(function* claims() {
        const store = yield* PreferenceStore;
        const at = DateTime.makeUnsafe("2054-10-13T06:19:00Z");

        const lease = {
          at,
          staleBefore: DateTime.subtract(at, { minutes: 10 }),
        };

        const asking = yield* freshUser;
        const never = yield* freshUser;

        yield* store.change(asking, { email: { weeklyDigest: true } }, at);
        yield* store.change(never, { email: { postPublished: true } }, at);

        const readersOf = (
          forWeek: DateTime.Utc,
          after = Option.none<UserId>()
        ) => store.digestReaders({ after, limit: 100_000, week: forWeek });

        const readers = yield* readersOf(week.from);

        assert.include(readers, asking);
        assert.notInclude(readers, never);
        assert.deepStrictEqual(readers, readers.toSorted(), "by id");
        assert.notInclude(
          yield* readersOf(week.from, Option.some(asking)),
          asking
        );

        // Claimed: no second send meanwhile, until the lease is stale.
        const links = yield* store.claimDigest(asking, week.from, lease);

        assert.isTrue(Option.isSome(links));
        assert.isTrue(
          Option.isNone(yield* store.claimDigest(asking, week.from, lease))
        );
        assert.isTrue(
          Option.isNone(yield* store.claimDigest(never, week.from, lease))
        );

        // Refused for now: given back, and claimed again.
        yield* store.releaseDigest(asking);

        assert.isTrue(
          Option.isSome(yield* store.claimDigest(asking, week.from, lease))
        );

        // A lease older than the stale bound is taken over.
        assert.isTrue(
          Option.isSome(
            yield* store.claimDigest(asking, week.from, {
              at: DateTime.add(at, { minutes: 11 }),
              staleBefore: DateTime.add(at, { minutes: 1 }),
            })
          )
        );

        // Sent: no claim and no listing that week, the week after again.
        yield* store.digestSent(asking, week.from);

        assert.isTrue(
          Option.isNone(yield* store.claimDigest(asking, week.from, lease))
        );
        assert.notInclude(yield* readersOf(week.from), asking);
        assert.include(yield* readersOf(week.to), asking);

        // Turned off: no claim, and no longer listed.
        yield* store.change(asking, { email: { weeklyDigest: false } }, at);

        assert.isTrue(
          Option.isNone(yield* store.claimDigest(asking, week.to, lease))
        );
        assert.notInclude(yield* readersOf(week.to), asking);
      })
  );

  it.effect(
    "turn the digest off from a link of the current generation only, which turning it on again renews",
    () =>
      Effect.gen(function* links() {
        const store = yield* PreferenceStore;
        const at = DateTime.makeUnsafe("2054-10-13T06:19:00Z");

        const lease = {
          at,
          staleBefore: DateTime.subtract(at, { minutes: 10 }),
        };

        const userId = yield* freshUser;

        yield* store.change(
          userId,
          { email: { postPublished: true, weeklyDigest: true } },
          at
        );

        const first = Option.getOrThrow(
          yield* store.claimDigest(userId, week.from, lease)
        );

        yield* store.releaseDigest(userId);
        // Turned on again: the links sent before stop working.
        yield* store.change(userId, { email: { weeklyDigest: true } }, at);

        const second = Option.getOrThrow(
          yield* store.claimDigest(userId, week.from, lease)
        );

        assert.notStrictEqual(second, first);
        assert.isFalse(yield* store.unsubscribeDigest(userId, first, at));
        assert.isTrue(yield* store.unsubscribeDigest(userId, second, at));

        const chosen = (yield* store.forUsers([userId])).get(userId);

        assert.isDefined(chosen);
        assert.isFalse(chosen.email.weeklyDigest);
        // Only the digest: the rest stays as chosen.
        assert.isTrue(chosen.email.postPublished);
      })
  );
});
