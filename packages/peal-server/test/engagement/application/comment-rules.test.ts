import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { MessageStorage, ShardingConfig } from "effect/cluster";
import { SqlClient } from "effect/sql";

import { CommentRules } from "#engagement/application/comment-rules.ts";
import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { EngagementReplies } from "#engagement/application/engagement-replies.ts";
import { EngagementChannels } from "#engagement/application/ports/engagement-channels.ts";
import { EngagementOutcomes } from "#engagement/application/ports/engagement-outcomes.ts";
import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import { FollowedPosts } from "#engagement/application/ports/followed-posts.ts";
import { ReplyJobs } from "#engagement/application/ports/reply-jobs.ts";
import { RuleStarters } from "#engagement/application/ports/rule-starters.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import { maxChannelRepliesPerDay } from "#engagement/domain/comment-rule.ts";
import { receiveComment } from "#engagement/domain/comment.ts";
import { ThreadIdSchema } from "#engagement/domain/thread-id.ts";
import { followPost } from "#engagement/domain/thread.ts";
import { DrizzleCommentRuleStore } from "#engagement/infrastructure/drizzle-comment-rule-store.ts";
import { DrizzleEngagementRecords } from "#engagement/infrastructure/drizzle-engagement-records.ts";
import { DrizzleEngagementStore } from "#engagement/infrastructure/drizzle-engagement-store.ts";
import { PublishingReplyLimits } from "#engagement/infrastructure/publishing-reply-limits.ts";
import { UnreadComments } from "#publishing/container.ts";
import { newId } from "#shared/application/ids.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { reading } from "#test/engagement/support.ts";
import { actorIn } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Comment rules on Postgres, with the inbox's own replies: a comment that
// holds a keyword is answered once, its author once, a rule's day bounded,
// and a platform whose rules forbid it refuses the rule. Rows are written
// under a workspace of each test's own, on the real clock (the pool's
// timers would replay a virtual one's years), and deleted after.

const utc = (iso: string) => DateTime.makeUnsafe(iso);

// The channels' platforms, as a test sets them.
const platformsOf = Ref.makeUnsafe<ReadonlyMap<ChannelId, Platform>>(new Map());

// The channels each post is for, as publishing would say, scheduled or out.
const postChannels = Ref.makeUnsafe<ReadonlyMap<PostId, readonly ChannelId[]>>(
  new Map()
);

const FakeFollowedPosts = Layer.succeed(
  FollowedPosts,
  FollowedPosts.of({
    channelsOf: (_workspaceId, postId) =>
      Ref.get(postChannels).pipe(
        Effect.map((known) => known.get(postId) ?? [])
      ),
    from: () => Effect.succeed([]),
  })
);

// The replies' jobs started: a reply is journalled, never sent here.
const started = Ref.makeUnsafe<readonly string[]>([]);

const FakeChannels = Layer.succeed(
  EngagementChannels,
  EngagementChannels.of({
    belongs: (channelId) =>
      Ref.get(platformsOf).pipe(Effect.map((known) => known.has(channelId))),
    describe: (channelId) =>
      Ref.get(platformsOf).pipe(
        Effect.map((known) => ({
          connection: Option.none(),
          platform: known.get(channelId) ?? "mastodon",
          scopes: [
            "read",
            "write",
            "read:statuses",
            "write:statuses",
            "profile",
          ],
        }))
      ),
  })
);

const RulesTest = CommentRules.layer.pipe(
  Layer.provideMerge(EngagementReplies.layer),
  Layer.provideMerge(DrizzleEngagementRecords),
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleCommentRuleStore,
      DrizzleEngagementStore,
      FakeChannels,
      FakeFollowedPosts,
      PublishingReplyLimits,
      Layer.succeed(
        ReplyJobs,
        ReplyJobs.of({
          cancel: () => Effect.void,
          start: (replyId) => Ref.update(started, (ids) => [...ids, replyId]),
        })
      ),
      Layer.succeed(
        EngagementOutcomes,
        EngagementOutcomes.of({
          received: () => Effect.void,
          replied: () => Effect.void,
        })
      ),
      Layer.succeed(
        RuleStarters,
        RuleStarters.of({
          of: (rule) =>
            Effect.succeed({
              _tag: "acting",
              actor: actorIn(rule.workspaceId, permissionsFor("editor")),
            }),
        })
      ),
      UnreadComments,
      MeteredUsage.layerUnmetered
    )
  ),
  Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
  // The transaction runner's, though nothing here starts a job of the
  // cluster's: replies' jobs are a fake's.
  Layer.provideMerge(
    MessageStorage.layerMemory.pipe(Layer.provide(ShardingConfig.layer()))
  ),
  Layer.provideMerge(DatabaseTest)
);

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use((sql) =>
    Effect.all([
      sql`DELETE FROM engagement.comment_rules WHERE workspace_id = ${workspaceId}`,
      sql`DELETE FROM engagement.threads WHERE workspace_id = ${workspaceId}`,
    ])
  ).pipe(Effect.orDie);

const publishedAt = "2047-03-02T10:00:00.000Z";

// A post that went out on a channel of `platform`, followed by the inbox.
const threadOn = Effect.fn("threadOn")(function* threadOn(
  workspaceId: WorkspaceId,
  platform: Platform,
  onPost?: PostId
) {
  const channelId = yield* newId(ChannelIdSchema);

  yield* Ref.update(
    platformsOf,
    (known) => new Map([...known, [channelId, platform]])
  );

  const thread = followPost(yield* newId(ThreadIdSchema), {
    authorId: Option.none(),
    channelId,
    permalink: Option.none(),
    platformPostId: PlatformPostIdSchema.make("1001"),
    postId: onPost ?? (yield* newId(PostIdSchema)),
    publishedAt: utc(publishedAt),
    targetId: yield* newId(PostTargetIdSchema),
    workspaceId,
  });

  yield* EngagementStore.use((store) => store.follow([thread]));

  return thread;
});

// Comments received now, as the collection keeps them.
const received = Effect.fn("received")(function* received(
  thread: Effect.Success<ReturnType<typeof threadOn>>,
  given: readonly { readonly author: number; readonly text: string }[]
) {
  const now = yield* DateTime.now;

  const comments = yield* Effect.forEach(
    (one: { readonly author: number; readonly text: string }) =>
      newId(CommentIdSchema).pipe(
        Effect.map((id) =>
          receiveComment(
            id,
            thread,
            reading(one.author, {
              platformCommentId: `${String(one.author)}-${one.text}`,
              text: one.text,
              writtenAt: now,
            }),
            now
          )
        )
      )
  )(given);

  yield* EngagementStore.use((store) => store.saveComments(comments));

  return comments;
});

describe("comment rules", () => {
  it.live(
    "answer a comment that holds a keyword, once, and its author once",
    () =>
      Effect.gen(function* answers() {
        const workspaceId = yield* freshWorkspace;

        yield* Effect.gen(function* checks() {
          const thread = yield* threadOn(workspaceId, "mastodon");
          const rules = yield* CommentRules;

          const rule = yield* rules.start(actorIn(workspaceId), {
            keywords: ["Price", "prix"],
            reply: "The price list is on our site.",
            scope: { _tag: "channel", channelId: thread.channelId },
          });

          assert.deepStrictEqual(
            rule.channels.map(({ platform, reply }) => [platform, reply]),
            [["mastodon", "available"]]
          );

          const [asks, other, again] = yield* received(thread, [
            { author: 1, text: "What is the PRICE?" },
            { author: 2, text: "Lovely photo" },
            { author: 1, text: "And the prix for two?" },
          ]);

          const run = yield* rules.runDue;

          assert.strictEqual(run.replied, 1);
          assert.strictEqual((yield* Ref.get(started)).length, 1);

          const after = yield* rules.get(actorIn(workspaceId), rule.rule.id);

          assert.deepStrictEqual(
            new Map(
              after.matches.map(({ commentId, outcome }) => [
                commentId,
                outcome._tag,
              ])
            ),
            new Map([
              [asks?.id, "replied"],
              [again?.id, "samePerson"],
            ])
          );
          assert.isFalse(
            after.matches.some(({ commentId }) => commentId === other?.id)
          );

          // A later run looks at nothing again.
          assert.strictEqual((yield* rules.runDue).looked, 0);
          assert.strictEqual((yield* Ref.get(started)).length, 1);
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }).pipe(Effect.provide(RulesTest))
  );

  it.live(
    "are refused where the platform's rules forbid an app to answer",
    () =>
      Effect.gen(function* refuses() {
        const workspaceId = yield* freshWorkspace;

        yield* Effect.gen(function* checks() {
          const thread = yield* threadOn(workspaceId, "bluesky");

          const refused = yield* CommentRules.use((rules) =>
            rules.start(actorIn(workspaceId), {
              keywords: ["price"],
              reply: "The price list is on our site.",
              scope: { _tag: "channel", channelId: thread.channelId },
            })
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "CommentRuleNotPossible");
          assert.deepStrictEqual(
            refused._tag === "CommentRuleNotPossible"
              ? refused.channels.map(({ reply }) => reply)
              : [],
            ["notAllowed"]
          );

          const none = yield* CommentRules.use((rules) =>
            rules.start(actorIn(workspaceId), {
              keywords: ["  "],
              reply: "Hello",
              scope: { _tag: "channel", channelId: thread.channelId },
            })
          ).pipe(Effect.flip);

          assert.strictEqual(
            none._tag === "CommentRuleNotPossible" ? none.reason : none._tag,
            "keywords"
          );

          const contributor = yield* CommentRules.use((rules) =>
            rules.start(actorIn(workspaceId, permissionsFor("contributor")), {
              keywords: ["price"],
              reply: "Hello",
              scope: { _tag: "channel", channelId: thread.channelId },
            })
          ).pipe(Effect.flip);

          assert.strictEqual(contributor._tag, "MissingPermission");
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }).pipe(Effect.provide(RulesTest))
  );

  it.live("answer nothing received before they started, nor while paused", () =>
    Effect.gen(function* waits() {
      const workspaceId = yield* freshWorkspace;

      yield* Effect.gen(function* checks() {
        const thread = yield* threadOn(workspaceId, "mastodon");

        yield* received(thread, [{ author: 3, text: "price?" }]);
        yield* Effect.sleep("5 millis");

        const rules = yield* CommentRules;

        const rule = yield* rules.start(actorIn(workspaceId), {
          keywords: ["price"],
          reply: "On our site.",
          scope: { _tag: "post", postId: thread.postId },
        });

        assert.strictEqual((yield* rules.runDue).looked, 0);

        yield* rules.change(actorIn(workspaceId), rule.rule.id, {
          paused: true,
        });
        yield* Effect.sleep("5 millis");
        yield* received(thread, [{ author: 4, text: "price please" }]);

        assert.strictEqual((yield* rules.runDue).looked, 0);

        // Set going again, it never answers what came while it was paused.
        yield* rules.change(actorIn(workspaceId), rule.rule.id, {
          paused: false,
        });

        assert.strictEqual((yield* rules.runDue).looked, 0);

        yield* rules.stop(actorIn(workspaceId), rule.rule.id);

        const stopped = yield* rules.get(actorIn(workspaceId), rule.rule.id);

        assert.strictEqual(stopped.rule.status._tag, "ended");
      }).pipe(Effect.ensuring(forget(workspaceId)));
    }).pipe(Effect.provide(RulesTest))
  );

  it.live("take a rule on a post not out yet, on the channels it is for", () =>
    Effect.gen(function* scheduled() {
      const workspaceId = yield* freshWorkspace;

      yield* Effect.gen(function* checks() {
        const postId = yield* newId(PostIdSchema);
        const mastodon = yield* newId(ChannelIdSchema);

        yield* Ref.update(
          platformsOf,
          (known) => new Map([...known, [mastodon, "mastodon"]])
        );
        yield* Ref.update(
          postChannels,
          (known) => new Map([...known, [postId, [mastodon]]])
        );

        const rules = yield* CommentRules;

        const rule = yield* rules.start(actorIn(workspaceId), {
          keywords: ["price"],
          reply: "On our site.",
          scope: { _tag: "post", postId },
        });

        assert.deepStrictEqual(
          rule.channels.map(({ channelId, reply }) => [channelId, reply]),
          [[mastodon, "available"]]
        );

        // Once out, the inbox follows it there, and the rule answers.
        const thread = yield* threadOn(workspaceId, "mastodon", postId);

        yield* Effect.sleep("5 millis");
        yield* received(thread, [{ author: 3, text: "price?" }]);

        assert.strictEqual((yield* rules.runDue).replied, 1);
      }).pipe(Effect.ensuring(forget(workspaceId)));
    }).pipe(Effect.provide(RulesTest))
  );

  it.live("end a channel's rules when the channel is disconnected", () =>
    Effect.gen(function* channelGone() {
      const workspaceId = yield* freshWorkspace;

      yield* Effect.gen(function* checks() {
        const thread = yield* threadOn(workspaceId, "mastodon");
        const rules = yield* CommentRules;

        const rule = yield* rules.start(actorIn(workspaceId), {
          keywords: ["price"],
          reply: "On our site.",
          scope: { _tag: "channel", channelId: thread.channelId },
        });

        yield* EngagementRecords.use((records) =>
          records.channelGone(
            thread.channelId,
            "mastodon",
            DateTime.nowUnsafe()
          )
        );

        const ended = yield* rules.get(actorIn(workspaceId), rule.rule.id);

        assert.deepStrictEqual(
          ended.rule.status._tag === "ended" ? ended.rule.status.reason : null,
          "channelGone"
        );
      }).pipe(Effect.ensuring(forget(workspaceId)));
    }).pipe(Effect.provide(RulesTest))
  );

  it.live(
    "never answer on a channel whose platform forbids it, on a post that went out on several",
    () =>
      Effect.gen(function* refusesThere() {
        const workspaceId = yield* freshWorkspace;

        yield* Effect.gen(function* checks() {
          const mastodon = yield* threadOn(workspaceId, "mastodon");

          const bluesky = yield* threadOn(
            workspaceId,
            "bluesky",
            mastodon.postId
          );

          const rules = yield* CommentRules;

          const rule = yield* rules.start(actorIn(workspaceId), {
            keywords: ["price"],
            reply: "On our site.",
            scope: { _tag: "post", postId: mastodon.postId },
          });

          assert.deepStrictEqual(
            new Map(
              rule.channels.map(({ platform, reply }) => [platform, reply])
            ),
            new Map([
              ["bluesky", "notAllowed"],
              ["mastodon", "available"],
            ])
          );

          yield* Effect.sleep("5 millis");

          const [onBluesky] = yield* received(bluesky, [
            { author: 5, text: "price?" },
          ]);

          const [onMastodon] = yield* received(mastodon, [
            { author: 6, text: "price?" },
          ]);

          const before = (yield* Ref.get(started)).length;
          const run = yield* rules.runDue;

          assert.strictEqual(run.replied, 1);
          assert.strictEqual((yield* Ref.get(started)).length, before + 1);

          const after = yield* rules.get(actorIn(workspaceId), rule.rule.id);

          assert.deepStrictEqual(
            after.matches.map(({ commentId }) => commentId),
            [onMastodon?.id]
          );
          assert.isFalse(
            after.matches.some(({ commentId }) => commentId === onBluesky?.id)
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }).pipe(Effect.provide(RulesTest))
  );

  it.live(
    "answer no more than a channel's day allows, every rule together",
    () =>
      Effect.gen(function* boundedDay() {
        const workspaceId = yield* freshWorkspace;

        yield* Effect.gen(function* checks() {
          const thread = yield* threadOn(workspaceId, "mastodon");
          const rules = yield* CommentRules;
          const sql = yield* SqlClient.SqlClient;

          const first = yield* rules.start(actorIn(workspaceId), {
            keywords: ["hours"],
            reply: "Nine to five.",
            scope: { _tag: "channel", channelId: thread.channelId },
          });

          // The channel's day, full: as many replies as it takes, today.
          const earlier = yield* received(
            thread,
            Array.from({ length: maxChannelRepliesPerDay }, (_, n) => ({
              author: 100 + n,
              text: `earlier ${String(n)}`,
            }))
          );

          for (const comment of earlier) {
            yield* sql`INSERT INTO engagement.comment_rule_matches (rule_id, comment_id, outcome, looked_at)
            VALUES (${first.rule.id}, ${comment.id}, 'replied', now())`;
          }

          const second = yield* rules.start(actorIn(workspaceId), {
            keywords: ["price"],
            reply: "On our site.",
            scope: { _tag: "post", postId: thread.postId },
          });

          yield* Effect.sleep("5 millis");
          yield* received(thread, [{ author: 7, text: "price?" }]);

          const before = (yield* Ref.get(started)).length;

          yield* rules.runDue;

          assert.strictEqual((yield* Ref.get(started)).length, before);
          assert.deepStrictEqual(
            (yield* rules.get(actorIn(workspaceId), second.rule.id)).matches,
            []
          );
        }).pipe(Effect.ensuring(forget(workspaceId)));
      }).pipe(Effect.provide(RulesTest))
  );
});
