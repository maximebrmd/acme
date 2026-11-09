import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Schedule,
} from "effect";

import {
  isTokenExpired,
  markRefreshNeeded,
  renewToken,
} from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import type { Platform } from "#channels/domain/platform.ts";
import { tokenLifetimeOf } from "#channels/domain/token-policy.ts";
import type { TokenPolicy } from "#channels/domain/token-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { isTokenRejected } from "#shared/domain/token-rejected.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";

import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotices } from "./channel-notices.ts";
import { ChannelRepository } from "./channel-repository.ts";
import { decryptTokens, encryptTokens } from "./channel-tokens.ts";
import { ChannelUnusable } from "./channel-unusable.ts";
import { PlatformAuthorizers } from "./platform-authorizer.ts";
import type { IssuedTokens, StoredTokens } from "./platform-authorizer.ts";
import { TokenCipher } from "./token-cipher.ts";

/** Who a channel posts as, on which platform. */
export interface ChannelAccount {
  /** The account's id on the platform, as the channel stores it. */
  readonly accountId: string;
  readonly channelId: ChannelId;
  readonly platform: Platform;
}

/** A channel's token, decrypted for the platform calls about to be made. */
export interface ChannelToken extends ChannelAccount {
  /**
   * The credential calls are made with: the access token, or for Bluesky
   * the OAuth client's saved session, as JSON, whose access token and DPoP
   * key sign each call.
   */
  readonly accessToken: Redacted.Redacted;
}

/** Why no usable token could be given. */
export type AccessFailure =
  | ChannelUnusable
  | DatabaseError
  | PlatformUnavailable
  | TokenExpired;

// A token that expires this soon is renewed before it is used: the call it
// is for would reach the platform after it expired.
const expiryMargin = Duration.minutes(1);

// A renewed token must be saved, or a rotated session is lost: the save is
// retried a few times before giving up.
const saveRetry = Schedule.exponential("200 millis");

const saveRetries = 3;

// What a renewal under the channel's lock came to.
type Renewal =
  | {
      readonly _tag: "renewed";
      readonly channel: Channel;
      readonly tokens: StoredTokens;
    }
  | { readonly _tag: "reconnect"; readonly marked: Channel };

const isDue = (channel: Channel, now: DateTime.Utc): boolean =>
  channel.token._tag === "refreshable" &&
  DateTime.isLessThanOrEqualTo(
    channel.token.expiresAt,
    DateTime.addDuration(now, expiryMargin)
  );

const sameToken = (left: Redacted.Redacted, right: Redacted.Redacted) =>
  Redacted.value(left) === Redacted.value(right);

const tokenOf = (channel: Channel, tokens: StoredTokens): ChannelToken => ({
  accessToken: tokens.accessToken,
  accountId: channel.accountId,
  channelId: channel.id,
  platform: channel.platform,
});

/**
 * Hands publishing a token that works: decrypted, renewed through the
 * platform's authorizer when it has expired or the platform refused it once,
 * under the channel's lock so a rotating refresh token is never used twice.
 * When renewing fails for good, or a renewed token is refused too, the
 * channel is marked `refreshNeeded` and its workspace told to reconnect it.
 */
export class ChannelAccess extends Context.Service<
  ChannelAccess,
  {
    /** Who the channel posts as, if it can post. */
    readonly account: (
      channelId: ChannelId
    ) => Effect.Effect<
      ChannelAccount,
      ChannelUnusable | DatabaseError | TokenExpired
    >;
    /**
     * Runs `use` with the channel's token. When `use` fails with
     * TokenRejected, the token is renewed and `use` runs once more: a
     * refused token means the platform did nothing, so `use` must only fail
     * that way when that holds.
     */
    readonly withToken: <A, E, R>(
      channelId: ChannelId,
      use: (token: ChannelToken) => Effect.Effect<A, E | TokenRejected, R>
    ) => Effect.Effect<A, AccessFailure | Exclude<E, TokenRejected>, R>;
  }
>()("acme-server/channels/application/ChannelAccess") {
  static readonly layer = Layer.effect(
    ChannelAccess,
    Effect.gen(function* ChannelAccessLive() {
      const authorizers = yield* PlatformAuthorizers;
      const channels = yield* ChannelRepository;
      const locks = yield* ChannelLocks;
      const notices = yield* ChannelNotices;
      const cipher = yield* TokenCipher;
      const withCipher = Effect.provideService(TokenCipher, cipher);

      // The channel, if it can post at all.
      const usable = Effect.fn("ChannelAccess.usable")(function* usable(
        channelId: ChannelId
      ) {
        const found = yield* channels.get(channelId);

        if (Option.isNone(found)) {
          return yield* new ChannelUnusable({ channelId, reason: "notFound" });
        }

        const channel = found.value;

        if (channel.status._tag === "disabled") {
          return yield* new ChannelUnusable({ channelId, reason: "disabled" });
        }

        if (channel.status._tag === "refreshNeeded") {
          return yield* new TokenExpired();
        }

        return channel;
      });

      // The channel's tokens as stored, if they can be read: a token this
      // server cannot decrypt cannot be used, as its key left the keyring.
      const storedTokens = Effect.fn("ChannelAccess.storedTokens")(
        function* storedTokens(channel: Channel) {
          const stored = yield* channels.credentials(channel.id);

          if (Option.isNone(stored)) {
            return Option.none<StoredTokens>();
          }

          return yield* decryptTokens(stored.value, channel.id).pipe(
            withCipher,
            Effect.tapError((failure) =>
              Effect.logError(
                "A channel's token could not be decrypted",
                failure
              ).pipe(Effect.annotateLogs({ channelId: channel.id }))
            ),
            Effect.option
          );
        }
      );

      // Marks the channel as needing a reconnect; the caller tells its
      // workspace once the lock is released.
      const markLocked = Effect.fn("ChannelAccess.mark")(function* markLocked(
        channel: Channel
      ) {
        const marked = markRefreshNeeded(channel, yield* DateTime.now);

        yield* channels.update(marked, Option.none());

        const renewal: Renewal = { _tag: "reconnect", marked };

        return renewal;
      });

      const saveRenewed = Effect.fn("ChannelAccess.saveRenewed")(
        function* saveRenewed(
          channel: Channel,
          issued: IssuedTokens,
          policy: TokenPolicy
        ) {
          const now = yield* DateTime.now;

          const updated = renewToken(
            channel,
            {
              scopes: issued.scopes,
              token: tokenLifetimeOf(policy, issued, now),
            },
            now
          );

          const credentials = yield* encryptTokens(issued, channel.id).pipe(
            withCipher,
            Effect.orDie
          );

          yield* channels
            .update(updated, Option.some(credentials))
            .pipe(Effect.retry({ schedule: saveRetry, times: saveRetries }));

          const renewal: Renewal = {
            _tag: "renewed",
            channel: updated,
            tokens: {
              accessToken: issued.accessToken,
              refreshToken: issued.refreshToken,
            },
          };

          return renewal;
        }
      );

      // Renews the channel's token under its lock: when `rejected` was
      // refused, or when the token is due. Another renewal may have come
      // first while this one waited: its token is used as it is.
      const renewLocked = Effect.fn("ChannelAccess.renewLocked")(
        function* renewLocked(
          channelId: ChannelId,
          rejected: Option.Option<Redacted.Redacted>
        ) {
          const channel = yield* usable(channelId);
          const tokens = yield* storedTokens(channel);

          if (Option.isNone(tokens)) {
            return yield* markLocked(channel);
          }

          const now = yield* DateTime.now;

          const renewedMeanwhile = Option.match(rejected, {
            onNone: () => !isDue(channel, now),
            onSome: (refused) => !sameToken(refused, tokens.value.accessToken),
          });

          if (renewedMeanwhile) {
            const renewal: Renewal = {
              _tag: "renewed",
              channel,
              tokens: tokens.value,
            };

            return renewal;
          }

          const authorizer = authorizers.for(channel.platform);

          // No authorizer: this server cannot renew the platform's tokens.
          if (Option.isNone(authorizer)) {
            return yield* markLocked(channel);
          }

          const renewed = yield* authorizer.value
            .refresh(channel, tokens.value)
            .pipe(Effect.result);

          if (renewed._tag === "Failure") {
            // Refused for good, or not answered: then the call waits.
            return renewed.failure._tag === "TokenExpired"
              ? yield* markLocked(channel)
              : yield* renewed.failure;
          }

          return yield* saveRenewed(
            channel,
            renewed.success,
            authorizer.value.policy
          );
        }
      );

      const renew = Effect.fn("ChannelAccess.renew")(function* renew(
        channelId: ChannelId,
        rejected: Option.Option<Redacted.Redacted>
      ) {
        const renewal = yield* locks.withLock(
          channelId,
          renewLocked(channelId, rejected)
        );

        if (renewal._tag === "reconnect") {
          yield* notices.reconnectRequired(renewal.marked);

          return yield* new TokenExpired();
        }

        return tokenOf(renewal.channel, renewal.tokens);
      });

      // The token will not work until the user reconnects the channel: it
      // was refused once renewed, or ran out with nothing to renew it, or
      // cannot be read.
      const requireReconnect = Effect.fn("ChannelAccess.requireReconnect")(
        function* requireReconnect(channelId: ChannelId) {
          const renewal = yield* locks.withLock(
            channelId,
            usable(channelId).pipe(Effect.flatMap(markLocked))
          );

          if (renewal._tag === "reconnect") {
            yield* notices.reconnectRequired(renewal.marked);
          }

          return yield* new TokenExpired();
        }
      );

      // The channel's token, renewed first if it has run out or is about to.
      const current = Effect.fn("ChannelAccess.current")(function* current(
        channelId: ChannelId
      ) {
        const channel = yield* usable(channelId);
        const now = yield* DateTime.now;

        if (isTokenExpired(channel, now)) {
          return yield* requireReconnect(channelId);
        }

        if (isDue(channel, now)) {
          return yield* renew(channelId, Option.none());
        }

        const tokens = yield* storedTokens(channel);

        if (Option.isNone(tokens)) {
          return yield* requireReconnect(channelId);
        }

        return tokenOf(channel, tokens.value);
      });

      const withToken = <A, E, R>(
        channelId: ChannelId,
        use: (token: ChannelToken) => Effect.Effect<A, E | TokenRejected, R>
      ): Effect.Effect<A, AccessFailure | Exclude<E, TokenRejected>, R> =>
        current(channelId).pipe(
          Effect.flatMap((token) =>
            use(token).pipe(
              Effect.catchIf(isTokenRejected, () =>
                renew(channelId, Option.some(token.accessToken)).pipe(
                  Effect.flatMap((renewed) =>
                    use(renewed).pipe(
                      Effect.catchIf(isTokenRejected, () =>
                        requireReconnect(channelId)
                      )
                    )
                  )
                )
              )
            )
          ),
          Effect.withSpan("ChannelAccess.withToken", {
            attributes: { channelId },
          })
        );

      const account = Effect.fn("ChannelAccess.account")(function* account(
        channelId: ChannelId
      ) {
        const channel = yield* usable(channelId);

        const found: ChannelAccount = {
          accountId: channel.accountId,
          channelId: channel.id,
          platform: channel.platform,
        };

        return found;
      });

      return ChannelAccess.of({ account, withToken });
    })
  );
}
