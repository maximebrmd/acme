import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref, Result, Schema } from "effect";

import { PlatformClients } from "#publishing/application/platform-client.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget } from "#publishing/domain/post-target.ts";
import { createDraft, schedulePost } from "#publishing/domain/post.ts";
import type { Post } from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import type { Allowance } from "#shared/domain/allowance.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
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

const RecordingClients = Layer.succeed(
  PlatformClients,
  PlatformClients.of({
    for: (platform) =>
      Option.some({
        platform,
        publish: (post) =>
          Ref.update(handed, (posts) => [...posts, post]).pipe(
            Effect.as({ _tag: "unconfirmed" as const, reason: "noResponse" })
          ),
        resume: () =>
          Effect.succeed({
            _tag: "unconfirmed" as const,
            reason: "noResponse",
          }),
      }),
  })
);

// The workspace's plan, as a test sets it: no limit unless told.
const plan = Ref.makeUnsafe<{
  readonly channels: Allowance;
  readonly connected: number;
  readonly posts: Allowance;
}>({ channels: Option.none(), connected: 1, posts: Option.none() });

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
    scheduledPerMonth: () =>
      Ref.get(plan).pipe(Effect.map(({ posts }) => posts)),
  })
);

const PublisherTest = RoutedPlatformPublisher.pipe(
  Layer.provide(
    Layer.mergeAll(
      PlanTest,
      RecordingClients,
      credentialsOf(
        { accountId: "UC-synthetic-channel", platform: "youtube" },
        ["token-1"]
      )
    )
  ),
  Layer.provideMerge(DrizzlePostRepository),
  Layer.provideMerge(DatabaseTest)
);

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
          channels: Option.some(3),
          connected: 1,
          posts: Option.some(1),
        });

        assert.strictEqual(yield* send(second), "planLimit");
        assert.strictEqual(yield* send(first), "sent");

        // More channels than the plan allows: nothing goes out.
        yield* Ref.set(plan, {
          channels: Option.some(3),
          connected: 4,
          posts: Option.none(),
        });

        assert.strictEqual(yield* send(first), "planLimit");
        assert.strictEqual((yield* Ref.get(handed)).length, 1);

        yield* Ref.set(plan, {
          channels: Option.none(),
          connected: 1,
          posts: Option.none(),
        });
        yield* Effect.all([
          posts.remove(first.postId),
          posts.remove(second.postId),
        ]).pipe(Effect.orDie);
      })
  );
});
