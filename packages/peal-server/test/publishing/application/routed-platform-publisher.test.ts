import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref, Schema } from "effect";

import { PlatformClients } from "#publishing/application/platform-client.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { RoutedPlatformPublisher } from "#publishing/application/routed-platform-publisher.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget } from "#publishing/domain/post-target.ts";
import { createDraft } from "#publishing/domain/post.ts";
import { TikTokOptions } from "#publishing/domain/tiktok-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema, PostIdSchema } from "#shared/domain/ids.ts";
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

const PublisherTest = RoutedPlatformPublisher.pipe(
  Layer.provide(
    Layer.mergeAll(
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
});
