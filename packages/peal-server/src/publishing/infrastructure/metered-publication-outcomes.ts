import { Effect, Layer, Option } from "effect";

import { MeteredPosts } from "#billing/application/metered-posts.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import { partsOn } from "#publishing/domain/post-content.ts";
import { livePartsOf } from "#publishing/domain/post-target.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { countLinks } from "#publishing/domain/text-length.ts";

/**
 * Outcomes told through `told`, after billing counted each post that went
 * out (MeteredPosts), in the transaction that settled it: billing keeps the
 * platforms that bill the server per post, and whether the post's text on
 * the channel held a link, as X finds links (`countLinks`). Each part of a
 * post is a post to the platform, so every part the round sent is counted,
 * with its own text, whether or not a later part failed; a part an earlier
 * round sent was counted then. An unconfirmed post, or part, a member later
 * finds went out is not counted. The database failing
 * rolls the settlement back with the count, and the step is retried. The
 * channel is read with the repository port its jobs read any workspace's
 * channel with.
 */
export const meteredOutcomes = <E, R>(
  told: Layer.Layer<PublicationOutcomes, E, R>
) =>
  Layer.effect(
    PublicationOutcomes,
    Effect.gen(function* MeteredPublicationOutcomes() {
      const outcomes = yield* PublicationOutcomes;
      const channels = yield* ChannelRepository;
      const metered = yield* MeteredPosts;
      const posts = yield* PostRepository;

      const count = Effect.fn("PublicationOutcomes.count")(function* count(
        target: PostTarget
      ) {
        // What the round that just settled sent: a target published by a
        // job from before parts were kept has its one part.
        const sent = livePartsOf(target).filter(
          ({ round }) => round === target.round
        );

        if (sent.length === 0) {
          return;
        }

        const found = yield* posts.find(target.postId);
        const channel = yield* channels.get(target.channelId);

        if (Option.isNone(found) || Option.isNone(channel)) {
          return;
        }

        const { post } = found.value;
        const texts = partsOn(post.content, target.channelId);

        yield* Effect.forEach(
          sent,
          ({ index, publishedAt }) =>
            metered.published({
              platform: channel.value.platform,
              publishedAt,
              withLink: countLinks(texts[index]?.text ?? "") > 0,
              workspaceId: post.workspaceId,
            }),
          { discard: true }
        );
      });

      return PublicationOutcomes.of({
        resolved: outcomes.resolved,
        settled: (target) =>
          count(target).pipe(Effect.andThen(outcomes.settled(target))),
      });
    })
  ).pipe(Layer.provide(told));
