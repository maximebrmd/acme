import { assert, layer } from "@effect/vitest";
import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { MeteredPosts } from "#billing/application/metered-posts.ts";
import type { PublishedPost } from "#billing/application/metered-posts.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { connectChannel } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { createDraft } from "#publishing/domain/post.ts";
import { meteredOutcomes } from "#publishing/infrastructure/metered-publication-outcomes.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { contentOf } from "#test/publishing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c"
);

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000101");

const onX = ChannelIdSchema.make("00000000-0000-7000-8000-000000000201");

const onMastodon = ChannelIdSchema.make("00000000-0000-7000-8000-000000000202");

const publishedAt = DateTime.makeUnsafe("2026-11-09T10:00:00Z");

// The post links to Peal on X, without a scheme, and says nothing of it on
// Mastodon, where it has its own text.
const post = createDraft(
  postId,
  workspaceId,
  contentOf("Read peal.social", {
    overrides: [[onMastodon, "Hello, Mastodon"]],
  }),
  Option.none()
);

const channelOn = (id: ChannelId, platform: Platform) =>
  connectChannel(
    {
      accountId: `account-${platform}`,
      avatarUrl: Option.none(),
      connection: Option.none(),
      displayName: Option.none(),
      handle: "@peal_example",
      id,
      platform,
      scopes: [],
      token: { _tag: "nonExpiring" },
      workspaceId,
    },
    publishedAt
  );

const channels = [channelOn(onX, "x"), channelOn(onMastodon, "mastodon")];

const targetOn = (channelId: ChannelId, status: PostTargetStatus) =>
  new PostTarget({
    channelId,
    id: PostTargetIdSchema.make("00000000-0000-7000-8000-000000000301"),
    liveParts: [],
    options: Option.none(),
    postId,
    round: 1,
    status,
  });

const published: PostTargetStatus = {
  _tag: "published",
  permalink: Option.none(),
  platformPostId: Option.none(),
  publishedAt,
};

// What billing counted, and what the outcomes behind were told, in order.
class Recorded extends Context.Service<
  Recorded,
  {
    readonly counted: Ref.Ref<readonly PublishedPost[]>;
    readonly told: Ref.Ref<readonly PostTargetStatus["_tag"][]>;
  }
>()("test/publishing/Recorded") {
  static readonly layer = Layer.effect(
    Recorded,
    Effect.all({
      counted: Ref.make<readonly PublishedPost[]>([]),
      told: Ref.make<readonly PostTargetStatus["_tag"][]>([]),
    })
  );
}

const OutcomesTest = meteredOutcomes(
  Layer.effect(
    PublicationOutcomes,
    Recorded.use(({ told }) =>
      Effect.succeed(
        PublicationOutcomes.of({
          resolved: () => Effect.void,
          settled: (target) =>
            Ref.update(told, (all) => [...all, target.status._tag]),
        })
      )
    )
  )
).pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.mock(ChannelRepository, {
        get: (id) =>
          Effect.succeed(
            Option.fromUndefinedOr(channels.find((found) => found.id === id))
          ),
      }),
      Layer.mock(PostRepository, {
        find: (id) =>
          Effect.succeed(
            id === postId
              ? Option.some({ execution: Option.none(), post })
              : Option.none()
          ),
      }),
      Layer.effect(
        MeteredPosts,
        Recorded.use(({ counted }) =>
          Effect.succeed(
            MeteredPosts.of({
              ofWorkspace: () => Effect.succeed([]),
              published: (entry) =>
                Ref.update(counted, (all) => [...all, entry]),
            })
          )
        )
      )
    )
  ),
  Layer.provideMerge(Recorded.layer)
);

layer(OutcomesTest)("publication outcomes, metered", (it) => {
  it.effect(
    "tell billing of each post that went out, with or without a link, then tell the rest",
    () =>
      Effect.gen(function* meters() {
        const outcomes = yield* PublicationOutcomes;
        const { counted, told } = yield* Recorded;

        yield* outcomes.settled(targetOn(onX, published));
        yield* outcomes.settled(targetOn(onMastodon, published));
        yield* outcomes.settled(
          targetOn(onX, {
            _tag: "failed",
            code: Option.none(),
            failedAt: publishedAt,
            reason: "unavailable",
          })
        );

        assert.deepStrictEqual(yield* Ref.get(counted), [
          { platform: "x", publishedAt, withLink: true, workspaceId },
          { platform: "mastodon", publishedAt, withLink: false, workspaceId },
        ]);
        assert.deepStrictEqual(yield* Ref.get(told), [
          "published",
          "published",
          "failed",
        ]);
      })
  );
});
