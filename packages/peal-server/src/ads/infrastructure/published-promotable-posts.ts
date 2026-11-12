import { Effect, Layer, Option } from "effect";

import { PromotablePosts } from "#ads/application/ports/promotable-posts.ts";
import type { PublishedOn } from "#ads/application/ports/promotable-posts.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { PublishedTargets } from "#publishing/application/published-targets.ts";
import type { PublishedTarget } from "#publishing/application/published-targets.ts";

// A boost promotes a Page's post: a story leaves after a day, and a reel
// is known by its video's id, which no ad promotes. Only feed posts are
// offered.
const isFeedPost = (target: PublishedTarget) => Option.isNone(target.format);

/**
 * The workspace's published posts as publishing lists them, each with its
 * channel's account as the channels context holds it. A target whose
 * channel was disconnected since is left out: nothing says which account
 * published it, and so is a story or a reel (`isFeedPost`).
 */
export const PublishedPromotablePosts = Layer.effect(
  PromotablePosts,
  Effect.gen(function* PublishedPromotablePosts() {
    const published = yield* PublishedTargets;
    const channels = yield* ChannelRepository;

    return PromotablePosts.of({
      matching: (workspaceId, platformPostIds) =>
        published
          .byPlatformPostIds(workspaceId, platformPostIds)
          .pipe(
            Effect.map(
              (targets) =>
                new Map(
                  targets
                    .filter(isFeedPost)
                    .map(
                      ({ platformPostId, postId, targetId }) =>
                        [String(platformPostId), { postId, targetId }] as const
                    )
                )
            )
          ),
      ofPost: Effect.fn("PromotablePosts.ofPost")(
        function* ofPost(workspaceId, postId) {
          const targets = yield* published.ofPost(workspaceId, postId);
          const found: PublishedOn[] = [];

          for (const target of targets.filter(isFeedPost)) {
            const channel = yield* channels.findById(
              workspaceId,
              target.channelId
            );

            if (Option.isSome(channel)) {
              found.push({
                accountId: channel.value.accountId,
                channelId: target.channelId,
                connection: channel.value.connection,
                permalink: target.permalink,
                platform: channel.value.platform,
                platformPostId: target.platformPostId,
                postId: target.postId,
                publishedAt: target.publishedAt,
                targetId: target.targetId,
              });
            }
          }

          return found;
        }
      ),
    });
  })
);
