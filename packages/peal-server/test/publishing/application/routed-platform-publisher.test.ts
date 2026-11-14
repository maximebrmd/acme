import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref, Result, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { LinkShortener } from "#publishing/application/link-shortener.ts";
import { PlatformClients } from "#publishing/application/platform-client.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import type { MeteredPart } from "#publishing/application/post-meter.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import {
  CurrentThreadedPlatforms,
  threadedPlatformsWith,
} from "#publishing/application/threaded-platforms.ts";
import { Poll } from "#publishing/domain/poll.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget, PostTarget } from "#publishing/domain/post-target.ts";
import { createDraft, schedulePost } from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import type { MeterClaim } from "#shared/application/metered-usage.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import type { AllowanceReason } from "#shared/domain/allowance-reached.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";
import { credentialsOf } from "#test/publishing/platforms/support.ts";
import { contentOf } from "#test/publishing/support.ts";

const finishedYouTube = new YouTubeOptions({
  madeForKids: false,
  privacy: "unlisted",
  title: "A synthetic launch video",
});

// The routed publisher, on Postgres, with a YouTube client that keeps what
// it is handed.
const handed = Ref.makeUnsafe<readonly OutgoingPost[]>([]);

// Whether the platform refuses what it is handed, sending nothing.
const refusing = Ref.makeUnsafe(false);

const RecordingClients = Layer.succeed(
  PlatformClients,
  PlatformClients.of({
    for: (platform) =>
      Option.some({
        platform,
        publish: (post) =>
          Ref.get(refusing).pipe(
            Effect.flatMap((refuses) =>
              refuses
                ? Effect.fail(new BadRequest({ code: "synthetic-refusal" }))
                : Ref.update(handed, (posts) => [...posts, post]).pipe(
                    Effect.as({
                      _tag: "unconfirmed" as const,
                      reason: "noResponse",
                    })
                  )
            )
          ),
        resume: () =>
          Effect.succeed({
            _tag: "unconfirmed" as const,
            reason: "noResponse",
          }),
      }),
  })
);

interface PlanState {
  readonly channels: Allowance;
  readonly connected: number;
  readonly members: Allowance;
  readonly posts: Allowance;
  readonly taken: number;
}

const within: PlanState = {
  channels: Option.none(),
  connected: 1,
  members: Option.none(),
  posts: Option.none(),
  taken: 1,
};

// The workspace's plan, as a test sets it: no limit unless told.
const plan = Ref.makeUnsafe<PlanState>(within);

const PlanTest = Layer.succeed(
  PostAllowance,
  PostAllowance.of({
    channels: () =>
      Ref.get(plan).pipe(
        Effect.map(({ channels, connected }) => ({
          allowed: channels,
          connected,
        }))
      ),
    members: () =>
      Ref.get(plan).pipe(
        Effect.map(({ members, taken }) => ({ allowed: members, taken }))
      ),
    scheduledPerMonth: () =>
      Ref.get(plan).pipe(Effect.map(({ posts }) => posts)),
  })
);

// What the billing account's meter answers a part: granted, or refused
// for a reason; and the parts it was asked about and given back.
const meterAnswer = Ref.makeUnsafe<Option.Option<AllowanceReason>>(
  Option.none()
);

const metered = Ref.makeUnsafe<readonly MeteredPart[]>([]);

// What the meter answers a whole thread's room before its first part, and
// the threads it was asked about.
const roomAnswer = Ref.makeUnsafe<Option.Option<AllowanceReason>>(
  Option.none()
);

const roomAsked = Ref.makeUnsafe<readonly (readonly MeteredPart[])[]>([]);

const givenBack = Ref.makeUnsafe<readonly MeterClaim[]>([]);

const MeterTest = Layer.succeed(
  PostMeter,
  PostMeter.of({
    claim: (asked) =>
      Effect.gen(function* claim() {
        yield* Ref.update(metered, (all) => [...all, asked]);

        const refusal = yield* Ref.get(meterAnswer);

        if (Option.isSome(refusal)) {
          return yield* new AllowanceReached({
            allowed: 0,
            meter: "xApi",
            reason: refusal.value,
            resetsAt: DateTime.makeUnsafe("2026-07-01T00:00:00Z"),
            used: 0,
          });
        }

        return Option.some({
          at: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
          meter: "xApi" as const,
          units: 15,
          workspaceId: asked.workspaceId,
        });
      }),
    fits: (parts) =>
      Effect.gen(function* fits() {
        yield* Ref.update(roomAsked, (all) => [...all, parts]);

        return (yield* Ref.get(roomAnswer)).pipe(
          Option.map(
            (reason) =>
              new AllowanceReached({
                allowed: 0,
                meter: "xApi",
                reason,
                resetsAt: DateTime.makeUnsafe("2026-07-01T00:00:00Z"),
                used: 0,
              })
          )
        );
      }),
    giveBack: (claim) => Ref.update(givenBack, (all) => [...all, claim]),
  })
);

// The publisher, for channels of this account; `threaded` is what the
// operator set of later parts.
const publisherFor = (
  account: Parameters<typeof credentialsOf>[0],
  threaded: (platform: Platform) => boolean = threadedPlatformsWith(
    true,
    new Set()
  ).takesParts
) =>
  RoutedPlatformPublisher.pipe(
    Layer.provide(
      Layer.mergeAll(
        PlanTest,
        MeterTest,
        RecordingClients,
        credentialsOf(account, ["token-1"]),
        Layer.succeed(CurrentThreadedPlatforms, { takesParts: threaded }),
        LinkShortener.none
      )
    ),
    Layer.provideMerge(DrizzlePostRepository),
    Layer.provideMerge(DatabaseTest)
  );

const PublisherTest = publisherFor({
  accountId: "UC-synthetic-channel",
  platform: "youtube",
});

// On X, which bills the server for each post.
const XPublisherTest = publisherFor({
  accountId: "synthetic-x-account",
  platform: "x",
});

// On a platform with threads.
const ThreadPublisherTest = publisherFor({
  accountId: "synthetic@mastodon.test",
  platform: "mastodon",
});

const part = (text: string) =>
  new PostPart({ delaySeconds: 0, media: [], overrides: [], text });

layer(PublisherTest)("the platform adapters", (it) => {
  it.effect("receive the target's options with the post", () =>
    Effect.gen(function* receiveOptions() {
      const posts = yield* PostRepository;
      const postId = yield* newId(PostIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      const target = createTarget(
        yield* newId(PostTargetIdSchema),
        postId,
        channelId,
        Option.some(finishedYouTube)
      );

      yield* posts.insert(
        createDraft(
          postId,
          yield* freshWorkspace,
          contentOf("A synthetic video"),
          Option.none()
        ),
        [target]
      );

      yield* PlatformPublisher.use((publisher) =>
        publisher.publish({
          channelId,
          idempotencyKey: "a-synthetic-attempt",
          part: 0,
          postId,
          startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
          targetId: target.id,
        })
      ).pipe(Effect.ensuring(posts.remove(postId).pipe(Effect.orDie)));

      const [post] = yield* Ref.get(handed);

      assert.strictEqual(post?.text, "A synthetic video");
      // As an adapter reads its own platform's.
      assert.deepStrictEqual(
        post?.options.pipe(Option.filter(Schema.is(YouTubeOptions))),
        Option.some(finishedYouTube)
      );
      assert.deepStrictEqual(
        post?.options.pipe(Option.filter(Schema.is(TikTokOptions))),
        Option.none()
      );
    })
  );
  it.effect(
    "refuse a post the workspace's plan has no room for when it is due, sending nothing",
    () =>
      Effect.gen(function* overPlan() {
        const posts = yield* PostRepository;
        const workspaceId = yield* freshWorkspace;
        const channelId = yield* newId(ChannelIdSchema);
        const zone = TimeZoneIdSchema.make("Europe/Paris");
        const now = DateTime.makeUnsafe("2026-06-01T00:00:00Z");

        // A post scheduled in the workspace at `iso`, now due.
        const scheduled = Effect.fn("scheduled")(function* scheduled(
          id: WorkspaceId,
          iso: string
        ) {
          const postId = yield* newId(PostIdSchema);

          const target = createTarget(
            yield* newId(PostTargetIdSchema),
            postId,
            channelId,
            Option.some(finishedYouTube)
          );

          const post: Post = Result.getOrThrow(
            schedulePost(
              createDraft(
                postId,
                id,
                contentOf("A synthetic video"),
                Option.none()
              ),
              new Schedule({ at: DateTime.makeUnsafe(iso), timeZone: zone }),
              now
            )
          );

          yield* posts.insert(post, [target]);

          return { postId, targetId: target.id };
        });

        const first = yield* scheduled(workspaceId, "2026-06-10T08:00:00Z");
        const second = yield* scheduled(workspaceId, "2026-06-12T08:00:00Z");

        const send = ({
          postId,
          targetId,
        }: {
          readonly postId: typeof first.postId;
          readonly targetId: typeof first.targetId;
        }) =>
          PlatformPublisher.use((publisher) =>
            publisher.publish({
              channelId,
              idempotencyKey: `a-synthetic-attempt-${postId}`,
              part: 0,
              postId,
              startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
              targetId,
            })
          ).pipe(
            Effect.as("sent"),
            Effect.catchTag("BadRequest", ({ code }) => Effect.succeed(code))
          );

        yield* Ref.set(handed, []);

        // The month's posts: one, after the trial. The first by its time
        // goes out, the second does not.
        yield* Ref.set(plan, {
          ...within,
          channels: Option.some(3),
          posts: Option.some(1),
        });

        assert.strictEqual(yield* send(second), "planLimit");
        assert.strictEqual(yield* send(first), "sent");

        // More channels than the plan allows: nothing goes out.
        yield* Ref.set(plan, {
          ...within,
          channels: Option.some(3),
          connected: 4,
        });

        assert.strictEqual(yield* send(first), "planLimit");

        // More members than the plan allows: nothing either.
        yield* Ref.set(plan, { ...within, members: Option.some(2), taken: 5 });

        assert.strictEqual(yield* send(first), "planLimit");
        assert.strictEqual((yield* Ref.get(handed)).length, 1);

        yield* Ref.set(plan, within);
        yield* Effect.all([
          posts.remove(first.postId),
          posts.remove(second.postId),
        ]).pipe(Effect.orDie);
      })
  );
});

layer(ThreadPublisherTest)("the adapters of a platform with threads", (it) => {
  it.effect(
    "receive a later part with the posts it answers to, or nothing when one is unknown",
    () =>
      Effect.gen(function* receiveParts() {
        const posts = yield* PostRepository;
        const postId = yield* newId(PostIdSchema);
        const channelId = yield* newId(ChannelIdSchema);
        const publishedAt = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

        const live = (index: number, id: Option.Option<string>) => ({
          index,
          permalink: Option.none(),
          platformPostId: id.pipe(
            Option.map((given) => PlatformPostIdSchema.make(given))
          ),
          publishedAt,
          round: 1,
        });

        const pending = createTarget(
          yield* newId(PostTargetIdSchema),
          postId,
          channelId
        );

        // Two parts are live; the second was found by hand, without an id.
        const target = new PostTarget({
          channelId,
          id: pending.id,
          liveParts: [live(0, Option.some("root-1")), live(1, Option.none())],
          options: Option.none(),
          postId,
          round: 2,
          status: {
            _tag: "publishing",
            cancelRequested: false,
            startedAt: publishedAt,
          },
        });

        yield* posts.insert(
          createDraft(
            postId,
            yield* freshWorkspace,
            new PostContent({
              followUps: [part("Second"), part("Third")],
              media: [],
              overrides: [],
              text: "First",
            }),
            Option.none()
          ),
          [target]
        );

        const send = (sent: number) =>
          PlatformPublisher.use((publisher) =>
            publisher.publish({
              channelId,
              idempotencyKey: `a-synthetic-part-${String(sent)}`,
              part: sent,
              postId,
              startedAt: publishedAt,
              targetId: target.id,
            })
          ).pipe(Effect.result);

        const before = (yield* Ref.get(handed)).length;
        const second = yield* send(1);
        const third = yield* send(2);

        yield* posts.remove(postId).pipe(Effect.orDie);

        const received = (yield* Ref.get(handed)).slice(before);

        // The second part answers the first, which is also its root.
        assert.isTrue(Result.isSuccess(second));
        assert.deepStrictEqual(
          received.map(({ part: index, replyTo, text }) => ({
            index,
            replyTo,
            text,
          })),
          [
            {
              index: 1,
              replyTo: Option.some({ parent: "root-1", root: "root-1" }),
              text: "Second",
            },
          ]
        );

        // The third would answer a part Peal has no id for: nothing is sent.
        assert.deepStrictEqual(
          Result.getFailure(third),
          Option.some(new BadRequest({ code: "replyTargetUnknown" }))
        );
      })
  );
});

layer(PublisherTest)(
  "the adapters of a platform that takes a post alone",
  (it) => {
    it.effect("never receive a part after the first", () =>
      Effect.gen(function* refusesParts() {
        const posts = yield* PostRepository;
        const postId = yield* newId(PostIdSchema);
        const channelId = yield* newId(ChannelIdSchema);

        const target = createTarget(
          yield* newId(PostTargetIdSchema),
          postId,
          channelId
        );

        yield* posts.insert(
          createDraft(
            postId,
            yield* freshWorkspace,
            new PostContent({
              followUps: [part("Second")],
              media: [],
              overrides: [],
              text: "First",
            }),
            Option.none()
          ),
          [target]
        );

        const before = (yield* Ref.get(handed)).length;

        const refused = yield* PlatformPublisher.use((publisher) =>
          publisher.publish({
            channelId,
            idempotencyKey: "a-synthetic-stray-part",
            part: 1,
            postId,
            startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
            targetId: target.id,
          })
        ).pipe(
          Effect.flip,
          Effect.ensuring(posts.remove(postId).pipe(Effect.orDie))
        );

        assert.deepStrictEqual(
          refused,
          new BadRequest({ code: "partsNotSupported" })
        );
        assert.lengthOf(yield* Ref.get(handed), before);
      })
    );

    it.effect("never receive a poll they would not send", () =>
      Effect.gen(function* refusesPolls() {
        const posts = yield* PostRepository;
        const postId = yield* newId(PostIdSchema);
        const channelId = yield* newId(ChannelIdSchema);

        const target = createTarget(
          yield* newId(PostTargetIdSchema),
          postId,
          channelId
        );

        yield* posts.insert(
          createDraft(
            postId,
            yield* freshWorkspace,
            new PostContent({
              media: [],
              overrides: [],
              poll: Option.some(
                new Poll({ choices: ["Yes", "No"], durationMinutes: 60 })
              ),
              text: "A video's question",
            }),
            Option.none()
          ),
          [target]
        );

        const before = (yield* Ref.get(handed)).length;

        const refused = yield* PlatformPublisher.use((publisher) =>
          publisher.publish({
            channelId,
            idempotencyKey: "a-synthetic-stray-poll",
            part: 0,
            postId,
            startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
            targetId: target.id,
          })
        ).pipe(
          Effect.flip,
          Effect.ensuring(posts.remove(postId).pipe(Effect.orDie))
        );

        assert.deepStrictEqual(
          refused,
          new BadRequest({ code: "pollNotSupported" })
        );
        assert.lengthOf(yield* Ref.get(handed), before);
      })
    );
  }
);

layer(
  publisherFor(
    { accountId: "synthetic-x-account", platform: "x" },
    (platform) => platform !== "x"
  )
)("the adapters of X where the operator turned X threads off", (it) => {
  it.effect("never receive a part after the first, scheduled before", () =>
    Effect.gen(function* refusesParts() {
      const posts = yield* PostRepository;
      const postId = yield* newId(PostIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      const target = createTarget(
        yield* newId(PostTargetIdSchema),
        postId,
        channelId
      );

      yield* posts.insert(
        createDraft(
          postId,
          yield* freshWorkspace,
          new PostContent({
            followUps: [part("Second")],
            media: [],
            overrides: [],
            text: "First",
          }),
          Option.none()
        ),
        [target]
      );

      const before = (yield* Ref.get(handed)).length;

      const refused = yield* PlatformPublisher.use((publisher) =>
        publisher.publish({
          channelId,
          idempotencyKey: "a-synthetic-x-part",
          part: 1,
          postId,
          startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
          targetId: target.id,
        })
      ).pipe(
        Effect.flip,
        Effect.ensuring(posts.remove(postId).pipe(Effect.orDie))
      );

      assert.deepStrictEqual(
        refused,
        new BadRequest({ code: "partsNotSupported" })
      );
      assert.lengthOf(yield* Ref.get(handed), before);
    })
  );
});

// A post with a first comment, on a Facebook Page, in a workspace of its own.
const commentedPost = Effect.gen(function* commentedPost() {
  const posts = yield* PostRepository;
  const postId = yield* newId(PostIdSchema);
  const channelId = yield* newId(ChannelIdSchema);

  const target = createTarget(
    yield* newId(PostTargetIdSchema),
    postId,
    channelId
  );

  yield* posts.insert(
    createDraft(
      postId,
      yield* freshWorkspace,
      new PostContent({
        followUps: [part("The first comment")],
        media: [],
        overrides: [],
        text: "A page's post",
      }),
      Option.none()
    ),
    [target]
  );

  return { channelId, postId, target };
});

const firstCommentOf = (targetId: string) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly first_comment: boolean;
      }>`SELECT first_comment FROM publishing.post_targets WHERE id = ${targetId}`
  ).pipe(
    Effect.orDie,
    Effect.map(([row]) => row?.first_comment)
  );

layer(
  publisherFor(
    { accountId: "102000000000001", platform: "facebook" },
    threadedPlatformsWith(true, new Set(["facebook"])).takesParts
  )
)("the adapters of a platform of first comments", (it) => {
  it.effect("mark the target when its post goes out, before any comment", () =>
    Effect.gen(function* marksAtPost() {
      const posts = yield* PostRepository;
      const { channelId, postId, target } = yield* commentedPost;

      yield* Effect.gen(function* checks() {
        yield* PlatformPublisher.use((publisher) =>
          publisher.publish({
            channelId,
            idempotencyKey: "a-synthetic-page-post",
            part: 0,
            postId,
            startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
            targetId: target.id,
          })
        ).pipe(Effect.ignore);

        assert.isTrue(yield* firstCommentOf(target.id));
      }).pipe(Effect.ensuring(posts.remove(postId).pipe(Effect.orDie)));
    })
  );

  it.effect("mark the target before its comment goes out", () =>
    Effect.gen(function* marks() {
      const posts = yield* PostRepository;
      const { channelId, postId, target } = yield* commentedPost;

      yield* Effect.gen(function* checks() {
        assert.isFalse(yield* firstCommentOf(target.id));

        yield* PlatformPublisher.use((publisher) =>
          publisher.publish({
            channelId,
            idempotencyKey: "a-synthetic-first-comment",
            part: 1,
            postId,
            startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
            targetId: target.id,
          })
        ).pipe(Effect.ignore);

        assert.isTrue(yield* firstCommentOf(target.id));
      }).pipe(Effect.ensuring(posts.remove(postId).pipe(Effect.orDie)));
    })
  );
});

layer(
  publisherFor(
    { accountId: "102000000000001", platform: "facebook" },
    threadedPlatformsWith(true, new Set()).takesParts
  )
)("the adapters where first comments were turned off since", (it) => {
  it.effect("never receive the post, whose comment could not follow", () =>
    Effect.gen(function* refuses() {
      const posts = yield* PostRepository;
      const { channelId, postId, target } = yield* commentedPost;
      const before = (yield* Ref.get(handed)).length;

      const refused = yield* PlatformPublisher.use((publisher) =>
        publisher.publish({
          channelId,
          idempotencyKey: "a-synthetic-post-without-its-comment",
          part: 0,
          postId,
          startedAt: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
          targetId: target.id,
        })
      ).pipe(
        Effect.flip,
        Effect.ensuring(posts.remove(postId).pipe(Effect.orDie))
      );

      assert.deepStrictEqual(
        refused,
        new BadRequest({ code: "firstCommentsOff" })
      );
      assert.lengthOf(yield* Ref.get(handed), before);
    })
  );
});

layer(XPublisherTest)(
  "the adapters of a platform that bills per post",
  (it) => {
    // A post on X with `followUps` after its first part, `live` of them
    // out already, and a way to send each part.
    const onX = Effect.fn("onX")(function* onX(
      followUps: readonly string[],
      thread: {
        readonly live?: number;
        readonly poll?: Option.Option<Poll>;
      } = {}
    ) {
      const live = thread.live ?? 0;
      const poll = thread.poll ?? Option.none<Poll>();
      const posts = yield* PostRepository;
      const postId = yield* newId(PostIdSchema);
      const channelId = yield* newId(ChannelIdSchema);
      const publishedAt = DateTime.makeUnsafe("2026-06-15T08:00:00Z");

      const target = new PostTarget({
        channelId,
        id: yield* newId(PostTargetIdSchema),
        liveParts: Array.from({ length: live }, (_, index) => ({
          index,
          permalink: Option.none(),
          platformPostId: Option.some(
            PlatformPostIdSchema.make(`x-part-${String(index)}`)
          ),
          publishedAt,
          round: 1,
        })),
        options: Option.none(),
        postId,
        round: 1,
        status: {
          _tag: "publishing",
          cancelRequested: false,
          startedAt: publishedAt,
        },
      });

      yield* posts.insert(
        createDraft(
          postId,
          yield* freshWorkspace,
          new PostContent({
            followUps: followUps.map(part),
            media: [],
            overrides: [],
            poll,
            text: "We shipped it",
          }),
          Option.none()
        ),
        [target]
      );

      const send = (sent: number) =>
        PlatformPublisher.use((publisher) =>
          publisher.publish({
            channelId,
            idempotencyKey: `a-synthetic-x-part-${String(sent)}`,
            part: sent,
            postId,
            startedAt: publishedAt,
            targetId: target.id,
          })
        ).pipe(
          Effect.as("sent"),
          Effect.catchTag("BadRequest", ({ code }) => Effect.succeed(code))
        );

      return { remove: posts.remove(postId).pipe(Effect.orDie), send };
    });

    const reset = Effect.all([
      Ref.set(handed, []),
      Ref.set(metered, []),
      Ref.set(givenBack, []),
      Ref.set(meterAnswer, Option.none()),
      Ref.set(roomAnswer, Option.none()),
      Ref.set(roomAsked, []),
      Ref.set(refusing, false),
    ]);

    it.effect(
      "check the whole thread's room before its first part, then claim each part with its text",
      () =>
        Effect.gen(function* claims() {
          yield* reset;

          const first = yield* onX(["See https://example.com/launch"]);

          assert.strictEqual(yield* first.send(0), "sent");

          // Its second part, once the first is live: a repost's round
          // checks the parts still to go out.
          const rest = yield* onX(["See https://example.com/launch"], {
            live: 1,
          });

          assert.strictEqual(yield* rest.send(1), "sent");

          assert.deepStrictEqual(
            (yield* Ref.get(roomAsked)).map((parts) =>
              parts.map(({ text }) => text)
            ),
            [
              ["We shipped it", "See https://example.com/launch"],
              ["See https://example.com/launch"],
            ]
          );
          assert.deepStrictEqual(
            (yield* Ref.get(metered)).map(({ platform, text }) => [
              platform,
              text,
            ]),
            [
              ["x", "We shipped it"],
              ["x", "See https://example.com/launch"],
            ]
          );
          assert.lengthOf(yield* Ref.get(handed), 2);
          assert.lengthOf(yield* Ref.get(givenBack), 0);

          yield* Effect.all([first.remove, rest.remove]);
        })
    );

    it.effect(
      "send none of a thread the meter has no room for, in its standing's words",
      () =>
        Effect.gen(function* noRoom() {
          yield* reset;

          const { remove, send } = yield* onX(["Second", "Third"]);

          for (const [reason, code] of [
            ["ceilingReached", "xCeilingReached"],
            ["spendCapReached", "xCeilingReached"],
            ["paymentMethodRequired", "paymentMethodRequired"],
            ["paymentFailed", "paymentFailed"],
            ["planAllowance", "perAccountPricingRequired"],
          ] as const) {
            yield* Ref.set(roomAnswer, Option.some(reason));

            assert.strictEqual(yield* send(0), code);
          }

          assert.lengthOf(yield* Ref.get(metered), 0);
          assert.lengthOf(yield* Ref.get(handed), 0);

          yield* remove;
        })
    );

    it.effect(
      "say a thread refused at a later part was cut there, its first parts live",
      () =>
        Effect.gen(function* cut() {
          yield* reset;

          const { remove, send } = yield* onX(["Second", "Third"], { live: 1 });

          // The standing changed since the first part went out.
          yield* Ref.set(meterAnswer, Option.some("paymentFailed"));

          assert.strictEqual(yield* send(1), "xThreadCut");
          assert.lengthOf(yield* Ref.get(handed), 0);

          yield* remove;
        })
    );

    it.effect(
      "claim a post with a poll once, and send it with nothing at the ceiling",
      () =>
        Effect.gen(function* withPoll() {
          yield* reset;

          const poll = Option.some(
            new Poll({ choices: ["Yes", "No"], durationMinutes: 60 })
          );

          const { remove, send } = yield* onX([], { poll });

          assert.strictEqual(yield* send(0), "sent");
          assert.lengthOf(yield* Ref.get(metered), 1);
          assert.isTrue(
            Option.isSome(
              (yield* Ref.get(handed)).at(-1)?.poll ?? Option.none()
            )
          );

          yield* Ref.set(roomAnswer, Option.some("ceilingReached"));

          assert.strictEqual(yield* send(0), "xCeilingReached");
          assert.lengthOf(yield* Ref.get(handed), 1);

          yield* remove;
        })
    );

    it.effect("give back a part the platform refused", () =>
      Effect.gen(function* refusedByX() {
        yield* reset;

        const { remove, send } = yield* onX([]);

        yield* Ref.set(refusing, true);

        assert.strictEqual(yield* send(0), "synthetic-refusal");
        assert.lengthOf(yield* Ref.get(givenBack), 1);

        yield* remove;
      })
    );
  }
);
