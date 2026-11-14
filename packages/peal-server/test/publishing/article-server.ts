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
import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { ArticleEvents } from "#publishing/application/article-events.ts";
import { ArticleJournal } from "#publishing/application/article-journal.ts";
import { ArticleRecords } from "#publishing/application/article-records.ts";
import { ArticleStore } from "#publishing/application/article-store.ts";
import { Articles } from "#publishing/application/articles.ts";
import { AttachableMedia } from "#publishing/application/attachable-media.ts";
import { PostAllowance } from "#publishing/application/post-allowance.ts";
import type { Article } from "#publishing/domain/article.ts";
import { ChannelAccessSiteCredentials } from "#publishing/infrastructure/channel-access-credentials.ts";
import {
  DrizzleArticleJournal,
  DrizzleArticleStore,
} from "#publishing/infrastructure/drizzle-article-store.ts";
import { ListedSiteChannels } from "#publishing/infrastructure/listed-site-channels.ts";
import { WordPressSitePublisherLive } from "#publishing/infrastructure/platforms/wordpress/wordpress-articles.ts";
import { SqlArticleSendTurns } from "#publishing/infrastructure/sql-article-send-turns.ts";
import { WorkflowArticleJobs } from "#publishing/infrastructure/workflow-article-jobs.ts";
import { PublishArticleV1Live } from "#publishing/infrastructure/workflows/publish-article.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import { can } from "#shared/domain/access.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { authorizersOf } from "#test/channels/connect-support.ts";
import { editor } from "#test/channels/fakes/fake-wordpress.ts";
import type { FakeWordPress } from "#test/channels/fakes/fake-wordpress.ts";
import { RecordedNotices, TokenCipherTest } from "#test/channels/support.ts";
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

/** The files of the library deleted since the test began. */
export const deletedMedia = Ref.makeUnsafe<ReadonlySet<string>>(new Set());

// The library articles show files from: both images, but those deleted.
const LibraryTest = Layer.effect(
  AttachableMedia,
  Effect.gen(function* LibraryTest() {
    const library = yield* AttachableMedia;

    return AttachableMedia.of({
      lookUp: (actor, requested) =>
        Effect.all([
          library.lookUp(actor, requested),
          Ref.get(deletedMedia),
        ]).pipe(
          Effect.map(([files, deleted]) =>
            files.filter(({ mediaId }) => !deleted.has(mediaId))
          )
        ),
    });
  })
).pipe(
  Layer.provide(
    attachableMedia([
      mediaFile(coverImage.media.mediaId),
      mediaFile(bodyImage.media.mediaId),
    ])
  )
);

/** Whether the workspace's posts wait for an approval, whoever asks. */
export const approvalsHeld = Ref.makeUnsafe(false);

// The workspace's approval setting, as the test sets it.
const ApprovalGateTest = Layer.succeed(
  ApprovalGate,
  ApprovalGate.of({
    admit: () => Effect.succeed("admitted"),
    approved: () => Effect.succeed(false),
    follow: () => Effect.void,
    forgotten: () => Effect.void,
    holds: () => Ref.get(approvalsHeld),
    maySubmit: (actor) => Effect.succeed(can(actor, "post:schedule")),
    withdrawn: () => Effect.void,
  })
);

/** The channels the plan allows, none for no limit, and those connected. */
export const planChannels = Ref.makeUnsafe<{
  readonly allowed: Option.Option<number>;
  readonly connected: number;
}>({ allowed: Option.none(), connected: 1 });

const PostAllowanceTest = Layer.succeed(
  PostAllowance,
  PostAllowance.of({
    channels: () => Ref.get(planChannels),
    members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
    scheduledPerMonth: () => Effect.succeed(Option.none()),
  })
);

/**
 * What runs once a use case read an article, before it saves it: a job
 * that claims it meanwhile, as a test needs.
 */
export const afterArticleRead = Ref.makeUnsafe<
  Effect.Effect<void, DatabaseError>
>(Effect.void);

// The store, running `afterArticleRead` after each read of a workspace's
// article, once.
const HookedArticleStore = Layer.effect(
  ArticleStore,
  Effect.gen(function* HookedArticleStore() {
    const store = yield* ArticleStore;

    return ArticleStore.of({
      ...store,
      ofWorkspace: (workspaceId, articleId) =>
        store
          .ofWorkspace(workspaceId, articleId)
          .pipe(
            Effect.tap(() =>
              Ref.getAndSet(afterArticleRead, Effect.void).pipe(Effect.flatten)
            )
          ),
    });
  })
).pipe(Layer.provide(DrizzleArticleStore));

/**
 * How many more times the journal fails to begin an attempt's call, as
 * through a database outage.
 */
export const journalOutage = Ref.makeUnsafe(0);

// The journal, failing to begin calls while `journalOutage` says.
const OutagedArticleJournal = Layer.effect(
  ArticleJournal,
  Effect.gen(function* OutagedArticleJournal() {
    const journal = yield* ArticleJournal;

    return ArticleJournal.of({
      ...journal,
      begin: (call) =>
        Ref.modify(journalOutage, (left) => [
          left > 0,
          Math.max(0, left - 1),
        ]).pipe(
          Effect.flatMap((down) =>
            down
              ? Effect.fail(new DatabaseError({ cause: "synthetic outage" }))
              : journal.begin(call)
          )
        ),
    });
  })
).pipe(Layer.provide(DrizzleArticleJournal));

// The site's credential, as the channels context hands it out, with no
// authorizer: a refused one marks the channel to reconnect.
const SiteAccessTest = ChannelAccessSiteCredentials.pipe(
  Layer.provide(ChannelAccess.layer),
  Layer.provide(Layer.succeed(PlatformAuthorizers, authorizersOf())),
  Layer.provide(RecordedNotices.layer)
);

/**
 * What the outbound guard refuses, by the request's address: nothing
 * unless a test says.
 */
export const guardRefusal = Ref.makeUnsafe<
  (url: URL) => Option.Option<OutboundRequestRefused["reason"]>
>(() => Option.none());

// The guard, open to the fake sites on loopback but where a test refuses.
const SteeredOutboundGuard = Layer.succeed(
  OutboundGuard,
  OutboundGuard.of({
    check: (url) =>
      Ref.get(guardRefusal).pipe(
        Effect.flatMap((refusal) =>
          Option.match(refusal(url), {
            onNone: () => Effect.void,
            onSome: (reason) =>
              Effect.fail(
                new OutboundRequestRefused({ host: url.host, reason })
              ),
          })
        )
      ),
  })
);

const SitePublisherTest = WordPressSitePublisherLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      SiteAccessTest,
      mediaOf([coverImage, bodyImage]),
      DrizzleArticleStore,
      DrizzleArticleJournal
    )
  ),
  Layer.provide(Layer.mergeAll(FetchHttpClient.layer, SteeredOutboundGuard))
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
      HookedArticleStore,
      SqlArticleSendTurns,
      ApprovalGateTest,
      PostAllowanceTest,
      OutagedArticleJournal,
      WorkflowArticleJobs,
      ListedSiteChannels,
      LibraryTest,
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
