import { DateTime, Effect, Layer, Option } from "effect";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ArticleEvents } from "#publishing/application/article-events.ts";
import type { Article } from "#publishing/domain/article.ts";
import { isSitePlatform } from "#shared/domain/platform.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// What names the event: an article ends once in a round of a revision.
const keyOf = (article: Article, how: string) =>
  `article:${article.id}:${article.revision}:${article.round}:${how}:${DateTime.formatIso(article.updatedAt)}`;

/**
 * ArticleEvents as the workspace's webhook endpoints hear them: ids, the
 * site's platform as the channels context has it now (none once the
 * channel is gone), the site's id and address, never what the article
 * says. Each event is keyed by the article, its round and its end, so
 * it is told once.
 */
export const WebhookArticleEvents = Layer.effect(
  ArticleEvents,
  Effect.gen(function* WebhookArticleEvents() {
    const channels = yield* ChannelRepository;
    const webhooks = yield* WebhookEvents;

    const about = Effect.fn("ArticleEvents.about")(function* about(
      article: Article
    ) {
      const channel = yield* channels.get(article.channelId);

      const platform = channel.pipe(
        Option.map((found) => found.platform),
        Option.filter(isSitePlatform),
        Option.getOrNull
      );

      return {
        articleId: article.id,
        channelId: article.channelId,
        platform,
        workspaceId: article.workspaceId,
      };
    });

    return ArticleEvents.of({
      failed: Effect.fn("ArticleEvents.failed")(function* failed(article) {
        const { state } = article;

        if (state._tag !== "failed") {
          return;
        }

        yield* webhooks.publish({
          event: {
            data: {
              ...(yield* about(article)),
              code: state.code ?? null,
              failedAt: state.failedAt,
              reason: state.reason,
            },
            type: "article.failed",
          },
          key: keyOf(article, "failed"),
        });
      }),
      published: Effect.fn("ArticleEvents.published")(
        function* published(article) {
          const { state } = article;

          if (state._tag !== "published") {
            return;
          }

          yield* webhooks.publish({
            event: {
              data: {
                ...(yield* about(article)),
                permalink: state.permalink ?? null,
                platformPostId: state.platformPostId,
                publishedAt: state.publishedAt,
                siteStatus: article.content.siteStatus,
              },
              type: "article.published",
            },
            key: keyOf(article, "published"),
          });
        }
      ),
    });
  })
);
