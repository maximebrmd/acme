import { Effect, Layer, Option } from "effect";
import { Digest, SecureRandom } from "effect/crypto";
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
import { isEngaged } from "#engagement/domain/engagement-abilities.ts";
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
import type { ChannelId } from "#shared/domain/ids.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

/** Where the platforms' comments are read. */
export interface EngagementSettings {
  /** Bluesky's public AppView. */
  readonly blueskyAppView: URL;
  /** `https:`; `http:` only for tests against local fakes. */
  readonly mastodonScheme: "http:" | "https:";
}

const failedWith = (reason: ReplyFailure): SendOutcome => ({
  _tag: "failed",
  reason,
});

const notDone = (reason: ReplyFailure): ActionOutcome => ({
  _tag: "failed",
  reason,
});

/**
 * The platforms Peal reads comments on (`engagedPlatforms`), as the
 * channel's gate runs them: `CommentSource` reads threads, `ReplySender`
 * sends what the engagement tables hold, found by id, so no text travels
 * with a call. Each channel is found through the channels context
 * (ChannelAccess). Every request goes through the public HTTP client, so
 * the outbound guard checks the servers users chose. Needs the
 * EngagementStore, ChannelAccess, an HttpClient, the OutboundGuard, Digest
 * and SecureRandom.
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

      const platforms: Readonly<Record<EngagedPlatform, EngagementPlatform>> = {
        bluesky: yield* blueskyEngagement({
          appView: settings.blueskyAppView,
          http,
        }),
        mastodon: yield* mastodonEngagement({
          http,
          scheme: settings.mastodonScheme,
        }),
      };

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

        if (!isEngaged(account.platform)) {
          return yield* new ChannelUnreadable({ reason: "unsupported" });
        }

        return yield* platforms[account.platform].read(
          account,
          request.threads
        );
      });

      // The channel's account and its platform's adapter, or why nothing
      // can be sent: each before any request to the platform.
      const reach = (channelId: ChannelId) =>
        access.account(channelId).pipe(
          Effect.map(
            (
              account
            ): Option.Option<readonly [ChannelAccount, EngagementPlatform]> =>
              isEngaged(account.platform)
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

        return Option.all({ comment, thread }).pipe(
          Option.map((found) => ({
            reply: reply.value,
            sending: {
              createdAt: reply.value.createdAt,
              parentPlatformId: found.comment.platformCommentId,
              replyId: reply.value.id,
              rootPlatformPostId: found.thread.thread.platformPostId,
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

          if (Option.isNone(found)) {
            return failedWith("commentGone");
          }

          const reached = yield* reach(request.channelId).pipe(Effect.result);

          if (reached._tag === "Failure") {
            return failedWith(reached.failure);
          }

          if (Option.isNone(reached.success)) {
            return failedWith("channelUnavailable");
          }

          const [account, platform] = reached.success.value;

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

              return Option.isNone(platformId)
                ? notDone("commentGone")
                : yield* platform.withdraw(account, platformId.value);
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
 * The platforms as production reaches them. Needs the EngagementStore,
 * ChannelAccess and Dns, which the composition root provides.
 */
export const PlatformEngagementLive = platformEngagementWith({
  blueskyAppView: new URL("https://public.api.bsky.app"),
  mastodonScheme: "https:",
}).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(
    Layer.mergeAll(Digest.layerWebCrypto, SecureRandom.layerWebCrypto)
  )
);
