import { DateTime, Effect, Layer, Option, Redacted, Ref } from "effect";
import { MessageStorage } from "effect/cluster";
import { FetchHttpClient } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { encryptTokens } from "#channels/application/channel-tokens.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import { connectChannel } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import { ArticleEvents } from "#publishing/application/article-events.ts";
import { ArticleRecords } from "#publishing/application/article-records.ts";
import { Articles } from "#publishing/application/articles.ts";
import type { Article } from "#publishing/domain/article.ts";
import { ChannelAccessSiteCredentials } from "#publishing/infrastructure/channel-access-credentials.ts";
import {
  DrizzleArticleJournal,
  DrizzleArticleStore,
} from "#publishing/infrastructure/drizzle-article-store.ts";
import { ListedSiteChannels } from "#publishing/infrastructure/listed-site-channels.ts";
import { WordPressSitePublisherLive } from "#publishing/infrastructure/platforms/wordpress/wordpress-articles.ts";
import { WorkflowArticleJobs } from "#publishing/infrastructure/workflow-article-jobs.ts";
import { PublishArticleV1Live } from "#publishing/infrastructure/workflows/publish-article.ts";
import { newId } from "#shared/application/ids.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { authorizersOf } from "#test/channels/connect-support.ts";
import { editor } from "#test/channels/fakes/fake-wordpress.ts";
import type { FakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import {
  OpenOutboundGuard,
  RecordedNotices,
  TokenCipherTest,
} from "#test/channels/support.ts";
import {
  clusterOver,
  DatabaseTest,
} from "#test/publishing/infrastructure/harness.ts";
import { mediaOf, testFile } from "#test/publishing/platforms/support.ts";
import { attachableMedia, mediaFile } from "#test/publishing/support.ts";

/** An image of the library articles may show. */
export const coverImage = testFile("image", 4096);

/** Another, for an article's body. */
export const bodyImage = testFile("image", 2048);

/** How each article ended, as the webhooks would hear it. */
export const toldArticles = Ref.makeUnsafe<readonly string[]>([]);

const RecordedArticleEvents = Layer.succeed(
  ArticleEvents,
  ArticleEvents.of({
    failed: (article: Article) =>
      Ref.update(toldArticles, (told) => [...told, `failed:${article.id}`]),
    published: (article: Article) =>
      Ref.update(toldArticles, (told) => [...told, `published:${article.id}`]),
  })
);

// The site's credential, as the channels context hands it out, with no
// authorizer: a refused one marks the channel to reconnect.
const SiteAccessTest = ChannelAccessSiteCredentials.pipe(
  Layer.provide(ChannelAccess.layer),
  Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf())),
  Layer.provide(RecordedNotices.layer)
);

const SitePublisherTest = WordPressSitePublisherLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      SiteAccessTest,
      mediaOf([coverImage, bodyImage]),
      DrizzleArticleStore
    )
  ),
  Layer.provide(Layer.mergeAll(FetchHttpClient.layer, OpenOutboundGuard))
);

/**
 * The articles' use cases and their job on an in-memory cluster, sending
 * to fake WordPress sites over loopback, on the test database.
 */
export const ArticleServerTest = Layer.mergeAll(
  Articles.layer,
  ArticleRecords.layer,
  PublishArticleV1Live
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      DrizzleArticleStore,
      DrizzleArticleJournal,
      WorkflowArticleJobs,
      ListedSiteChannels,
      attachableMedia([
        mediaFile(coverImage.media.mediaId),
        mediaFile(bodyImage.media.mediaId),
      ]),
      RecordedArticleEvents,
      SitePublisherTest
    )
  ),
  Layer.provideMerge(ListChannels.layer),
  Layer.provideMerge(SqlChannelLocks),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(TokenCipherTest),
  Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
  Layer.provideMerge(clusterOver(MessageStorage.layerMemory)),
  Layer.provideMerge(DatabaseTest)
);

/** The fake site as a channel of the workspace, its password sealed. */
export const siteChannel = Effect.fn("test.siteChannel")(function* siteChannel(
  workspaceId: WorkspaceId,
  site: FakeWordPress,
  password = editor.password
) {
  const id = yield* newId(ChannelIdSchema).pipe(Effect.provide(IdsLive));

  const channel = connectChannel(
    {
      accountId: site.root,
      avatarUrl: Option.none(),
      connection: Option.none(),
      displayName: Option.some("Synthetic Garden Journal"),
      handle: new URL(site.home).host,
      id,
      platform: "wordpress",
      scopes: ["publish_posts", "upload_files"],
      token: { _tag: "nonExpiring" },
      workspaceId,
    },
    yield* DateTime.now
  );

  const credentials = yield* encryptTokens(
    {
      accessToken: Redacted.make(`${editor.login}:${password}`),
      expiresAt: Option.none(),
      refreshToken: Option.none(),
      renewable: false,
      scopes: channel.scopes,
    },
    id
  );

  yield* ChannelRepository.use((channels) =>
    channels.insert(channel, credentials)
  );

  return channel;
});
