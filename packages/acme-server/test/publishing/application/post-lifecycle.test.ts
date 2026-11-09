import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Option } from "effect";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostNotFound } from "#publishing/application/post-not-found.ts";
import { PostQueries } from "#publishing/application/post-queries.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { InvalidPostTransition } from "#publishing/domain/invalid-post-transition.ts";
import { InvalidTargetTransition } from "#publishing/domain/invalid-target-transition.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import {
  callsOn,
  eventually,
  isFinished,
  isSuspended,
  scheduleIn,
  setTime,
  storedPost,
  targetsOf,
} from "#test/publishing/infrastructure/harness.ts";
import { Outcomes } from "#test/publishing/infrastructure/recorded-outcomes.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { actorAs, apiKeyIn, contentOf } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The use cases that follow a post through its life: drafts listed and
// discarded, a scheduled post taken back to draft, and what members do once
// a post went out on a channel and did not plainly succeed.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

const freshUser = newId(WorkspaceIdSchema).pipe(
  Effect.map((id) => UserIdSchema.make(id))
);

const contributor = permissionsFor("contributor");

const draftOf = (
  workspaceId: WorkspaceId,
  author = actorAs(
    UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"),
    workspaceId
  ),
  channelIds: readonly ChannelId[] = [],
  text = "A synthetic draft."
) =>
  PostDrafts.use((drafts) =>
    drafts.create(author, { channelIds, content: contentOf(text) })
  ).pipe(Effect.map(({ post }) => post));

// A post on the channels at 08:00, finished once its job ran.
const publishedAt8 = Effect.fn("test.publishedAt8")(function* publishedAt8(
  workspaceId: WorkspaceId,
  channelIds: readonly [ChannelId, ...ChannelId[]]
) {
  const { post } = yield* PostScheduling.use((scheduling) =>
    scheduling.schedule(apiKeyIn(workspaceId), {
      channelIds,
      content: contentOf("A synthetic post."),
      schedule: scheduleIn("2026-06-15T08:00:00Z"),
    })
  );

  yield* eventually("the job sleeps", isSuspended(post.id));
  yield* setTime("2026-06-15T08:00:00Z");
  yield* eventually("the post finishes", isFinished(post.id));

  return post.id;
});

const targetOn = (postId: PostId, channelId: ChannelId) =>
  targetsOf(postId).pipe(
    Effect.map((targets) =>
      Option.getOrThrow(
        Option.fromUndefinedOr(
          targets.find((target) => target.channelId === channelId)
        )
      )
    )
  );

describe("PostQueries.listDrafts", () => {
  it.effect(
    "lists the workspace's drafts, newest first, a page at a time",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* listsDrafts() {
          const queries = yield* PostQueries;
          const workspaceId = yield* freshWorkspace;
          const other = yield* freshWorkspace;
          const actor = actorAs(yield* freshUser, workspaceId);
          const channelId = yield* connect(workspaceId, "mastodon");

          const first = yield* draftOf(workspaceId, actor);
          const second = yield* draftOf(workspaceId, actor);
          const third = yield* draftOf(workspaceId, actor, [channelId]);

          // Neither a scheduled post nor another workspace's draft.
          yield* PostScheduling.use((scheduling) =>
            scheduling.reschedule(
              actor,
              third.id,
              scheduleIn("2026-06-16T08:00:00Z")
            )
          );
          yield* draftOf(other);

          const page = yield* queries.listDrafts(actor, {
            after: Option.none(),
            limit: 1,
          });

          assert.deepStrictEqual(
            page.items.map(({ post }) => post.id),
            [second.id]
          );
          assert.deepStrictEqual(page.next, Option.some(second.id));

          const rest = yield* queries.listDrafts(actor, {
            after: page.next,
            limit: 10,
          });

          assert.deepStrictEqual(
            rest.items.map(({ post }) => post.id),
            [first.id]
          );
          assert.isTrue(Option.isNone(rest.next));

          const viewer = actorAs(
            yield* freshUser,
            workspaceId,
            permissionsFor("viewer")
          );

          assert.lengthOf(
            (yield* queries.listDrafts(viewer, {
              after: Option.none(),
              limit: 500,
            })).items,
            2
          );

          assert.deepStrictEqual(
            yield* queries
              .listDrafts(actorAs(yield* freshUser, workspaceId, []), {
                after: Option.none(),
                limit: 10,
              })
              .pipe(Effect.flip),
            new MissingPermission({ permission: "post:read" })
          );
        })
      ),
    timeout
  );
});

describe("PostDrafts.discard", () => {
  it.effect(
    "deletes a draft its author or a member with post:delete discards",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* discards() {
          const drafts = yield* PostDrafts;
          const workspaceId = yield* freshWorkspace;
          const authorId = yield* freshUser;
          const author = actorAs(authorId, workspaceId, contributor);
          const colleague = actorAs(yield* freshUser, workspaceId, contributor);
          const editor = actorAs(yield* freshUser, workspaceId);

          const mine = yield* draftOf(workspaceId, author);
          const another = yield* draftOf(workspaceId, author);

          assert.deepStrictEqual(mine.authorId, Option.some(authorId));

          assert.deepStrictEqual(
            yield* drafts.discard(colleague, mine.id).pipe(Effect.flip),
            new MissingPermission({ permission: "post:delete" })
          );

          yield* drafts.discard(author, mine.id);
          yield* drafts.discard(editor, another.id);

          const gone = yield* PostQueries.use((queries) =>
            queries.get(editor, mine.id)
          ).pipe(Effect.flip);

          assert.deepStrictEqual(gone, new PostNotFound({ postId: mine.id }));
          assert.deepStrictEqual(
            yield* drafts.discard(editor, another.id).pipe(Effect.flip),
            new PostNotFound({ postId: another.id })
          );

          const viewer = actorAs(
            yield* freshUser,
            workspaceId,
            permissionsFor("viewer")
          );

          assert.deepStrictEqual(
            yield* drafts.discard(viewer, mine.id).pipe(Effect.flip),
            new MissingPermission({ permission: "post:delete" })
          );
        })
      ),
    timeout
  );

  it.effect(
    "leaves a scheduled post, and a job left for it publishes nothing",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* keepsScheduled() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const editor = actorAs(yield* freshUser, workspaceId);
          const channelId = yield* connect(workspaceId, "mastodon");
          const post = yield* draftOf(workspaceId, editor, [channelId]);

          yield* scheduling.reschedule(
            editor,
            post.id,
            scheduleIn("2026-06-15T08:00:00Z")
          );

          assert.deepStrictEqual(
            yield* drafts.discard(editor, post.id).pipe(Effect.flip),
            new InvalidPostTransition({
              action: "discard",
              from: "scheduled",
              postId: post.id,
            })
          );

          yield* scheduling.unschedule(editor, post.id);
          yield* drafts.discard(editor, post.id);

          yield* setTime("2026-06-15T08:00:00Z");
          yield* setTime("2026-06-15T08:05:00Z");

          assert.lengthOf(yield* callsOn(channelId), 0);
        })
      ),
    timeout
  );
});

describe("PostScheduling.unschedule", () => {
  it.effect(
    "takes a scheduled post back to draft, to edit and schedule it again",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* unschedules() {
          const drafts = yield* PostDrafts;
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const editor = actorAs(yield* freshUser, workspaceId);
          const channelId = yield* connect(workspaceId, "mastodon");
          const post = yield* draftOf(workspaceId, editor, [channelId]);

          const scheduled = yield* scheduling.reschedule(
            editor,
            post.id,
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          assert.deepStrictEqual(
            yield* scheduling
              .unschedule(
                actorAs(yield* freshUser, workspaceId, contributor),
                post.id
              )
              .pipe(Effect.flip),
            new MissingPermission({ permission: "post:schedule" })
          );

          const draft = yield* scheduling.unschedule(editor, post.id);

          assert.strictEqual(draft.post.status._tag, "draft");
          assert.strictEqual(
            draft.post.scheduleRevision,
            scheduled.post.scheduleRevision + 1
          );
          assert.deepStrictEqual(
            draft.targets.map((target) => target.channelId),
            [channelId]
          );

          assert.deepStrictEqual(
            yield* scheduling.unschedule(editor, post.id).pipe(Effect.flip),
            new InvalidPostTransition({
              action: "moveToDraft",
              from: "draft",
              postId: post.id,
            })
          );

          // Its old time passes: the job was stopped, and nothing goes out.
          yield* setTime("2026-06-15T08:00:00Z");
          yield* setTime("2026-06-15T08:30:00Z");

          assert.lengthOf(yield* callsOn(channelId), 0);

          yield* drafts.update(editor, post.id, {
            channelIds: [channelId],
            content: contentOf("Edited once taken back."),
          });

          yield* scheduling.reschedule(
            editor,
            post.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );

          yield* eventually("the new job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T09:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(channelId), 1);

          const { post: finished } = yield* storedPost(post.id);

          assert.strictEqual(finished.content.text, "Edited once taken back.");
        })
      ),
    timeout
  );
});

describe(PostFollowUp, () => {
  it.effect(
    "reposts a failed target in a new round, which finishes the post again",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* reposts() {
          const followUp = yield* PostFollowUp;
          const workspaceId = yield* freshWorkspace;
          const editor = actorAs(yield* freshUser, workspaceId);
          const fine = yield* connect(workspaceId, "mastodon");
          const refused = yield* connect(workspaceId, "bluesky");

          yield* FakePlatform.use((platform) =>
            platform.script(refused, [
              {
                _tag: "fail",
                failure: new BadRequest({ code: "duplicate" }),
              },
            ])
          );

          const postId = yield* publishedAt8(workspaceId, [fine, refused]);
          const failed = yield* targetOn(postId, refused);
          const before = (yield* storedPost(postId)).post;

          assert(before.status._tag === "finished");
          assert.strictEqual(before.status.outcome, "partiallyPublished");

          assert.deepStrictEqual(
            yield* followUp
              .repost(
                actorAs(yield* freshUser, workspaceId, contributor),
                postId,
                failed.id
              )
              .pipe(Effect.flip),
            new MissingPermission({ permission: "post:schedule" })
          );

          const reposted = yield* followUp.repost(editor, postId, failed.id);

          assert.strictEqual(reposted.post.status._tag, "publishing");
          assert.deepStrictEqual(
            reposted.targets.map(({ channelId, round, status }) => [
              channelId,
              round,
              status._tag,
            ]),
            [
              [fine, 1, "published"],
              [refused, 2, "pending"],
            ]
          );

          yield* eventually("the repost finishes", isFinished(postId));

          const { post } = yield* storedPost(postId);

          assert(post.status._tag === "finished");
          assert.strictEqual(post.status.outcome, "published");
          assert.lengthOf(yield* callsOn(refused), 2);

          // A published target is not sent again.
          const published = yield* targetOn(postId, fine);

          assert.deepStrictEqual(
            yield* followUp
              .repost(editor, postId, published.id)
              .pipe(Effect.flip),
            new InvalidTargetTransition({
              action: "repost",
              from: "published",
              targetId: published.id,
            })
          );

          const attempts = yield* PostQueries.use((queries) =>
            queries.attempts(editor, postId)
          );

          assert.deepStrictEqual(
            attempts
              .filter(({ targetId }) => targetId === failed.id)
              .map(({ attempt, outcome, round }) => [
                round,
                attempt,
                outcome._tag,
              ]),
            [
              [1, 1, "BadRequest"],
              [2, 1, "published"],
            ]
          );
        })
      ),
    timeout
  );

  it.effect(
    "confirms an unconfirmed target either way, and resolves its round",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* confirms() {
          const followUp = yield* PostFollowUp;
          const workspaceId = yield* freshWorkspace;
          const editor = actorAs(yield* freshUser, workspaceId);
          const lost = yield* connect(workspaceId, "mastodon");
          const missing = yield* connect(workspaceId, "bluesky");

          yield* Effect.forEach([lost, missing], (channelId) =>
            FakePlatform.use((platform) =>
              platform.script(channelId, [{ _tag: "loseResponse" }])
            )
          );

          const postId = yield* publishedAt8(workspaceId, [lost, missing]);
          const found = yield* targetOn(postId, lost);
          const notFound = yield* targetOn(postId, missing);

          assert.strictEqual(found.status._tag, "unconfirmed");

          const confirmed = yield* followUp.confirm(editor, postId, found.id, {
            _tag: "published",
            permalink: Option.some("https://social.example/@acme/1"),
          });

          const onLost = confirmed.targets.find(({ id }) => id === found.id);

          assert(onLost?.status._tag === "published");
          assert.deepStrictEqual(
            onLost.status.permalink,
            Option.some("https://social.example/@acme/1")
          );
          // Still to check on the other channel.
          assert(confirmed.post.status._tag === "finished");
          assert.strictEqual(confirmed.post.status.outcome, "unconfirmed");

          const checked = yield* followUp.confirm(editor, postId, notFound.id, {
            _tag: "notPublished",
          });

          assert(checked.post.status._tag === "finished");
          assert.strictEqual(checked.post.status.outcome, "partiallyPublished");
          assert.deepStrictEqual(
            checked.targets.map(({ status }) =>
              status._tag === "failed" ? status.reason : status._tag
            ),
            ["published", "notPublished"]
          );

          const resolved = yield* Outcomes.use(({ resolved: all }) => all);

          assert.deepStrictEqual(
            resolved
              .filter(({ postId: of }) => of === postId)
              .map(({ id }) => id),
            [found.id, notFound.id]
          );

          assert.deepStrictEqual(
            yield* followUp
              .confirm(editor, postId, found.id, { _tag: "notPublished" })
              .pipe(Effect.flip),
            new InvalidTargetTransition({
              action: "confirmNotPublished",
              from: "published",
              targetId: found.id,
            })
          );

          // A target of another post, or none, is not this post's.
          const stranger = PostTargetIdSchema.make(
            "00000000-0000-7000-8000-0000000c0de1"
          );

          assert.deepStrictEqual(
            yield* followUp
              .confirm(editor, postId, stranger, { _tag: "notPublished" })
              .pipe(Effect.flip),
            new PostNotFound({ postId })
          );
        })
      ),
    timeout
  );

  it.effect(
    "counts a repost's rate limit deadline from the repost",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* deadline() {
          const followUp = yield* PostFollowUp;
          const workspaceId = yield* freshWorkspace;
          const editor = actorAs(yield* freshUser, workspaceId);
          const channelId = yield* connect(workspaceId, "mastodon");

          yield* FakePlatform.use((platform) =>
            platform.script(channelId, [
              { _tag: "fail", failure: new BadRequest({ code: "duplicate" }) },
              {
                _tag: "fail",
                failure: new RateLimited({ retryAfter: Duration.minutes(1) }),
              },
            ])
          );

          const postId = yield* publishedAt8(workspaceId, [channelId]);
          const target = yield* targetOn(postId, channelId);

          // Past the day a first round may keep trying after its time.
          yield* setTime("2026-06-16T09:00:00Z");
          yield* followUp.repost(editor, postId, target.id);

          yield* eventually(
            "the repost waits to try again",
            PostQueries.use((queries) => queries.attempts(editor, postId)).pipe(
              Effect.map((attempts) =>
                attempts.some(
                  ({ retryAfter, round }) =>
                    round === 2 && Option.isSome(retryAfter)
                )
              )
            )
          );
        })
      ),
    timeout
  );
});
