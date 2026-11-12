import { DateTime, Effect, Layer, Option } from "effect";
import type { Redacted } from "effect";
import { Digest, Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import type { ChannelAccount } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { CommentSource } from "#engagement/application/ports/comment-source.ts";
import type { CommentsRequest } from "#engagement/application/ports/comment-source.ts";
import { EngagementStore } from "#engagement/application/ports/engagement-store.ts";
import { ReplySender } from "#engagement/application/ports/reply-sender.ts";
import type {
  ActionOutcome,
  ModerationRequest,
  SendRequest,
} from "#engagement/application/ports/reply-sender.ts";
import { readsCommentsOn } from "#engagement/domain/engagement-abilities.ts";
import type { EngagedPlatform } from "#engagement/domain/engagement-abilities.ts";
import { withdrawable } from "#engagement/domain/reply.ts";
import type { ReplyFailure, SendOutcome } from "#engagement/domain/reply.ts";
import { blueskyEngagement } from "#engagement/infrastructure/platforms/bluesky/bluesky-engagement.ts";
import {
  accessFailure,
  databaseDown,
  needsReconnect,
  unusable,
} from "#engagement/infrastructure/platforms/channel-refusals.ts";
import type {
  EngagementPlatform,
  OutgoingReply,
} from "#engagement/infrastructure/platforms/engagement-platform.ts";
import { mastodonEngagement } from "#engagement/infrastructure/platforms/mastodon/mastodon-engagement.ts";
import { facebookEngagement } from "#engagement/infrastructure/platforms/meta/facebook-engagement.ts";
import { instagramEngagement } from "#engagement/infrastructure/platforms/meta/instagram-engagement.ts";
import { keptWithoutRefresh } from "#engagement/infrastructure/platforms/refresh-bounds.ts";
import { maxThreadBytes } from "#engagement/infrastructure/platforms/thread-body.ts";
import {
  youtubeCommentUnitsConfig,
  youtubeEngagement,
} from "#engagement/infrastructure/platforms/youtube/youtube-engagement.ts";
import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { InboxPlatformsLive } from "#shared/infrastructure/inbox-platforms.ts";
import { metaAppConfig } from "#shared/infrastructure/platforms/meta-apps.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import type { MetaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import {
  publicHttpClient,
  publicHttpClientWith,
} from "#shared/infrastructure/platforms/public-http.ts";

/** Where the platforms' comments are read. */
export interface EngagementSettings {
  /** Bluesky's public AppView. */
  readonly blueskyAppView: URL;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
  /**
   * Meta's main app's secret, whose proof Facebook Login's calls carry;
   * none on a server without that app.
   */
  readonly metaAppSecret: Option.Option<Redacted.Redacted>;
  /** Where Meta's Graph hosts are. */
  readonly metaHosts: MetaHosts;
  /** The YouTube Data API's origin. */
  readonly youtubeApi: URL;
  /** The units comment reads may spend a day (`YOUTUBE_DAILY_COMMENT_UNITS`). */
  readonly youtubeCommentUnits: number;
}

const failedWith = (reason: ReplyFailure): SendOutcome => ({
  _tag: "failed",
  reason,
});

const notDone = (reason: ReplyFailure): ActionOutcome => ({
  _tag: "failed",
  reason,
});

// What the gate answers for a reply it did not call the platform for
// and cannot tell the fate of: one no longer on its way, whose job then
// finds it settled and keeps nothing of this, or a resumed one.
const notClaimed: SendOutcome = { _tag: "unconfirmed", reason: "interrupted" };

/**
 * The platforms Peal reads comments on (`engagedPlatforms`), as the
 * channel's gate runs them: `CommentSource` reads threads, `ReplySender`
 * sends what the engagement tables hold, found by id, so no text travels
 * with a call. Each channel is found through the channels context
 * (ChannelAccess). Every request goes through the public HTTP client, so
 * the outbound guard checks the servers users chose. Needs the
 * EngagementStore, ChannelAccess, an HttpClient, the OutboundGuard, Digest,
 * Mac, SecureRandom and publishing's PlatformQuota, the server's ledger
 * of YouTube's day; Facebook Pages, Instagram and YouTube are read where
 * CurrentInboxPlatforms names them.
 *
 * A platform not built yet has no entry in the registry below, which does
 * not compile without one for each of `engagedPlatforms`.
 */
export const platformEngagementWith = (settings: EngagementSettings) =>
  Layer.unwrap(
    Effect.gen(function* PlatformEngagement() {
      const access = yield* ChannelAccess;
      const store = yield* EngagementStore;
      const http = yield* publicHttpClient;

      // Threads are read with answers that end at `maxThreadBytes`: a post
      // with thousands of replies is read as far as that, never dropped.
      const reader = yield* publicHttpClientWith({
        maxResponseBytes: maxThreadBytes,
        overflow: "truncate",
        timeout: "20 seconds",
      });

      // Facebook Pages, Instagram and YouTube are read only where the
      // operator turned them on: a channel of a platform that is off is
      // never called, as one Peal reads no comments on.
      const inbox = yield* CurrentInboxPlatforms;

      const meta = {
        appSecret: settings.metaAppSecret,
        hosts: settings.metaHosts,
        http,
        reader,
      };

      const platforms: Readonly<Record<EngagedPlatform, EngagementPlatform>> = {
        bluesky: yield* blueskyEngagement({
          appView: settings.blueskyAppView,
          http,
          reader,
        }),
        facebook: yield* facebookEngagement(meta),
        instagram: yield* instagramEngagement(meta),
        mastodon: yield* mastodonEngagement({
          http,
          reader,
          scheme: settings.mastodonScheme,
        }),
        youtube: yield* youtubeEngagement({
          api: settings.youtubeApi,
          dailyUnits: settings.youtubeCommentUnits,
          http,
          reader,
        }),
      };

      const readHere = (platform: Platform): platform is EngagedPlatform =>
        readsCommentsOn(platform, inbox);

      const read = Effect.fn("CommentSource.read")(function* read(
        request: CommentsRequest
      ) {
        const account = yield* access.account(request.channelId).pipe(
          Effect.catchTags({
            ChannelUnusable: unusable,
            DatabaseError: databaseDown,
            TokenExpired: needsReconnect,
          })
        );

        if (!readHere(account.platform)) {
          return yield* new ChannelUnreadable({ reason: "unsupported" });
        }

        const batch = yield* platforms[account.platform].read(
          account,
          request.threads
        );

        return Option.match(keptWithoutRefresh[account.platform], {
          onNone: () => batch,
          onSome: (refreshWithin) => ({ ...batch, refreshWithin }),
        });
      });

      // The channel's account and its platform's adapter, or why nothing
      // can be sent: each before any request to the platform.
      const reach = (channelId: ChannelId) =>
        access.account(channelId).pipe(
          Effect.map(
            (
              account
            ): Option.Option<readonly [ChannelAccount, EngagementPlatform]> =>
              readHere(account.platform)
                ? Option.some([account, platforms[account.platform]])
                : Option.none()
          ),
          Effect.mapError(accessFailure)
        );

      // The reply as it goes out, from its journal row, its comment and
      // its thread; none when any of them is gone.
      const outgoing = Effect.fn("ReplySender.outgoing")(function* outgoing(
        request: SendRequest
      ) {
        const reply = yield* store.reply(request.replyId);

        if (Option.isNone(reply)) {
          return Option.none();
        }

        const comment = yield* store.comment(reply.value.commentId);
        const thread = yield* store.thread(reply.value.threadId);

        // The ids the thread's other replies were given on the platform.
        const takenIds = (yield* store.repliesOf(reply.value.threadId)).flatMap(
          (other) =>
            other.id !== reply.value.id && other.status._tag === "sent"
              ? Option.toArray(other.status.platformCommentId)
              : []
        );

        return Option.all({ comment, thread }).pipe(
          Option.map((found) => ({
            reply: reply.value,
            sending: {
              createdAt: reply.value.createdAt,
              grandparentPlatformId: found.comment.parentPlatformId,
              parentPlatformId: found.comment.platformCommentId,
              replyId: reply.value.id,
              rootPlatformPostId: found.thread.thread.platformPostId,
              takenIds,
              text: reply.value.text,
            } satisfies OutgoingReply,
          }))
        );
      });

      const sending = (
        request: SendRequest,
        mode: "resume" | "send"
      ): Effect.Effect<SendOutcome> =>
        Effect.gen(function* send() {
          const found = yield* outgoing(request);

          // A resumed reply may be out since its first run: whatever
          // keeps this run from asking the platform proves nothing.
          const stopped = (reason: ReplyFailure): SendOutcome =>
            mode === "send" ? failedWith(reason) : notClaimed;

          if (Option.isNone(found)) {
            return stopped("commentGone");
          }

          const reached = yield* reach(request.channelId).pipe(Effect.result);

          if (reached._tag === "Failure") {
            return stopped(reached.failure);
          }

          if (Option.isNone(reached.success)) {
            return stopped("channelUnavailable");
          }

          const [account, platform] = reached.success.value;

          // Claimed just before the call, and only while the reply is on
          // its way: one a person settled meanwhile, or that was handed
          // over as stranded while this call waited its turn, is not
          // sent, nor looked up to be sent. Its job finds it settled.
          if (!(yield* store.claimCall(request.replyId, yield* DateTime.now))) {
            return notClaimed;
          }

          return yield* platform[mode](account, found.value.sending);
        }).pipe(
          // The store could not be read: nothing was sent on a first run;
          // on a resume, nobody can tell.
          Effect.catchTag("DatabaseError", (failure) =>
            Effect.logWarning("Could not read a reply to send", failure).pipe(
              Effect.as<SendOutcome>(
                mode === "send"
                  ? failedWith("platformUnavailable")
                  : { _tag: "unconfirmed", reason: "interrupted" }
              )
            )
          )
        );

      const acting = (
        channelId: ChannelId,
        act: (
          account: ChannelAccount,
          platform: EngagementPlatform
        ) => Effect.Effect<ActionOutcome, { readonly _tag: "DatabaseError" }>
      ): Effect.Effect<ActionOutcome> =>
        Effect.gen(function* action() {
          const reached = yield* reach(channelId).pipe(Effect.result);

          if (reached._tag === "Failure") {
            return notDone(reached.failure);
          }

          if (Option.isNone(reached.success)) {
            return notDone("channelUnavailable");
          }

          const [account, platform] = reached.success.value;

          return yield* act(account, platform);
        }).pipe(
          Effect.catchTag("DatabaseError", () =>
            Effect.succeed(notDone("platformUnavailable"))
          )
        );

      const withdraw = (request: SendRequest) =>
        acting(
          request.channelId,
          Effect.fn("ReplySender.withdraw")(
            function* withdrawing(account, platform) {
              const reply = yield* store.reply(request.replyId);
              const platformId = reply.pipe(Option.flatMap(withdrawable));

              if (Option.isNone(reply) || Option.isNone(platformId)) {
                return notDone("commentGone");
              }

              const thread = yield* store.thread(reply.value.threadId);

              return Option.isNone(thread)
                ? notDone("commentGone")
                : yield* platform.withdraw(
                    account,
                    platformId.value,
                    thread.value.thread.platformPostId
                  );
            }
          )
        );

      const moderate = (request: ModerationRequest) =>
        acting(
          request.channelId,
          Effect.fn("ReplySender.moderate")(
            function* moderating(account, platform) {
              const comment = yield* store.comment(request.commentId);

              if (Option.isNone(comment)) {
                return notDone("commentGone");
              }

              const thread = yield* store.thread(comment.value.threadId);

              if (Option.isNone(thread)) {
                return notDone("commentGone");
              }

              return yield* platform.moderate(account, {
                action: request.action,
                platformCommentId: comment.value.platformCommentId,
                receivedAt: comment.value.receivedAt,
                rootPlatformPostId: thread.value.thread.platformPostId,
              });
            }
          )
        );

      return Layer.mergeAll(
        Layer.succeed(CommentSource, CommentSource.of({ read })),
        Layer.succeed(
          ReplySender,
          ReplySender.of({
            moderate,
            resume: (request) => sending(request, "resume"),
            send: (request) => sending(request, "send"),
            withdraw,
          })
        )
      );
    })
  );

/**
 * The platforms as production reaches them, Facebook Pages, Instagram and
 * YouTube where PEAL_INBOX_PLATFORMS names them, with Meta's main app's
 * secret for Facebook Login's proofs. Needs the EngagementStore,
 * ChannelAccess, publishing's PlatformQuota and Dns, which the
 * composition root provides.
 */
export const PlatformEngagementLive = Layer.unwrap(
  Effect.all({
    app: metaAppConfig,
    youtubeCommentUnits: youtubeCommentUnitsConfig,
  }).pipe(
    Effect.map(({ app, youtubeCommentUnits }) =>
      platformEngagementWith({
        blueskyAppView: new URL("https://public.api.bsky.app"),
        mastodonScheme: "https:",
        metaAppSecret: app.pipe(Option.map(({ appSecret }) => appSecret)),
        metaHosts,
        youtubeApi: new URL("https://www.googleapis.com"),
        youtubeCommentUnits,
      })
    )
  )
).pipe(
  Layer.provide(InboxPlatformsLive),
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(
    Layer.mergeAll(Digest.layerWebCrypto, Mac.layerWebCrypto).pipe(
      Layer.provideMerge(SecureRandom.layerWebCrypto)
    )
  )
);
