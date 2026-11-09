import { Context, DateTime, Effect, Layer, Option, Schedule } from "effect";

import { markRefreshNeeded, renewToken } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { platforms } from "#channels/domain/platform.ts";
import {
  isRefreshDue,
  refreshDueBefore,
  tokenLifetimeOf,
} from "#channels/domain/token-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotices } from "./channel-notices.ts";
import { ChannelRepository } from "./channel-repository.ts";
import { decryptTokens, encryptTokens } from "./channel-tokens.ts";
import { PlatformAuthorizers } from "./platform-authorizer.ts";
import type { PlatformAuthorizer } from "./platform-authorizer.ts";
import { TokenCipher } from "./token-cipher.ts";

/** What refreshing one channel came to. */
export type RefreshOutcome =
  // The platform renewed the token, and the channel saved it.
  | "refreshed"
  // Nothing to do: not due, not active, or no refresh for its platform here.
  | "skipped"
  // The platform refused for good: the channel now needs reconnecting.
  | "reconnectRequired"
  // The platform did not answer: the next sweep tries again.
  | "unavailable";

/** How many channels a sweep refreshed, and how it went. */
export interface SweepReport {
  readonly due: number;
  readonly failed: number;
  readonly reconnectRequired: number;
  readonly refreshed: number;
  readonly unavailable: number;
}

// Channels refreshed at once: refreshes wait on platforms, not on Acme.
const concurrency = 4;

// The most channels one sweep takes; the next takes the rest.
const sweepLimit = 200;

// A refresh that rotated the token must be saved, or the session is lost:
// the save is retried a few times before giving up.
const saveRetry = Schedule.exponential("200 millis");

const saveRetries = 3;

interface Locked {
  readonly outcome: RefreshOutcome;
  // The channel as marked, when it now needs reconnecting.
  readonly needsReconnect: Option.Option<Channel>;
}

const done = (outcome: RefreshOutcome): Locked => ({
  needsReconnect: Option.none(),
  outcome,
});

/**
 * Renews channels' tokens before they expire, through each platform's
 * authorizer and under each channel's lock, so a rotating refresh token is
 * never used twice. A refresh the platform refuses for good marks the channel
 * `refreshNeeded` and tells the workspace once; one it could not answer is
 * tried again by the next sweep.
 */
export class RefreshChannelTokens extends Context.Service<
  RefreshChannelTokens,
  {
    /** Refreshes the channel if it is due now. */
    readonly refresh: (
      channelId: ChannelId
    ) => Effect.Effect<RefreshOutcome, DatabaseError>;
    /** Refreshes every channel due now, a few at a time. Never fails. */
    readonly sweep: Effect.Effect<SweepReport>;
  }
>()("acme-server/channels/application/RefreshChannelTokens") {
  static readonly layer = Layer.effect(
    RefreshChannelTokens,
    Effect.gen(function* RefreshChannelTokensLive() {
      const authorizers = yield* PlatformAuthorizers;
      const channels = yield* ChannelRepository;
      const locks = yield* ChannelLocks;
      const notices = yield* ChannelNotices;
      const cipher = yield* TokenCipher;
      const tokenServices = Effect.provideService(TokenCipher, cipher);

      const markForReconnect = Effect.fn("RefreshChannelTokens.mark")(
        function* markForReconnect(channel: Channel) {
          const marked = markRefreshNeeded(channel, yield* DateTime.now);

          yield* channels.update(marked, Option.none());

          const locked: Locked = {
            needsReconnect: Option.some(marked),
            outcome: "reconnectRequired",
          };

          return locked;
        }
      );

      const refreshLocked = Effect.fn("RefreshChannelTokens.refreshLocked")(
        function* refreshLocked(
          channel: Channel,
          authorizer: PlatformAuthorizer
        ) {
          const stored = yield* channels.credentials(channel.id);

          if (Option.isNone(stored)) {
            return done("skipped");
          }

          // A token this server cannot decrypt cannot be used either: its key
          // left the keyring. Only reconnecting gives the channel a token again.
          const tokens = yield* decryptTokens(stored.value, channel.id).pipe(
            tokenServices,
            Effect.tapError((failure) =>
              Effect.logError(
                "A channel's token could not be decrypted",
                failure
              )
            ),
            Effect.option
          );

          if (Option.isNone(tokens)) {
            return yield* markForReconnect(channel);
          }

          const renewed = yield* authorizer
            .refresh(channel, tokens.value)
            .pipe(Effect.result);

          if (renewed._tag === "Failure") {
            return renewed.failure._tag === "TokenExpired"
              ? yield* markForReconnect(channel)
              : done("unavailable");
          }

          const issued = renewed.success;
          const now = yield* DateTime.now;

          const updated = renewToken(
            channel,
            {
              scopes: issued.scopes,
              token: tokenLifetimeOf(authorizer.policy, issued, now),
            },
            now
          );

          const credentials = yield* encryptTokens(issued, channel.id).pipe(
            tokenServices,
            Effect.orDie
          );

          yield* channels
            .update(updated, Option.some(credentials))
            .pipe(Effect.retry({ schedule: saveRetry, times: saveRetries }));

          return done("refreshed");
        }
      );

      const refresh = Effect.fn("RefreshChannelTokens.refresh")(
        function* refresh(channelId: ChannelId) {
          const locked = yield* locks.withLock(
            channelId,
            Effect.gen(function* refreshing() {
              // Read under the lock: another refresh, or a reconnect, may have
              // renewed the token while this one waited.
              const found = yield* channels.get(channelId);

              if (Option.isNone(found)) {
                return done("skipped");
              }

              const channel = found.value;
              const authorizer = authorizers.for(channel.platform);
              const now = yield* DateTime.now;

              if (
                Option.isNone(authorizer) ||
                !isRefreshDue(channel, authorizer.value.policy, now)
              ) {
                return done("skipped");
              }

              return yield* refreshLocked(channel, authorizer.value);
            })
          );

          if (Option.isSome(locked.needsReconnect)) {
            yield* notices.reconnectRequired(locked.needsReconnect.value);
          }

          return locked.outcome;
        }
      );

      const sweep = Effect.gen(function* sweep() {
        const now = yield* DateTime.now;

        const cutoffs = platforms.flatMap((platform) =>
          Option.toArray(
            Option.flatMap(authorizers.for(platform), (authorizer) =>
              refreshDueBefore(authorizer.policy, now)
            )
          ).map((before) => ({ before, platform }))
        );

        const due = yield* channels.dueForRefresh({
          cutoffs,
          limit: sweepLimit,
        });

        const outcomes = yield* Effect.forEach(
          due,
          (channel) =>
            refresh(channel.id).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning("Refreshing a channel failed", cause).pipe(
                  Effect.annotateLogs({ channelId: channel.id }),
                  Effect.as<RefreshOutcome | "failed">("failed")
                )
              )
            ),
          { concurrency }
        );

        const count = (outcome: RefreshOutcome | "failed") =>
          outcomes.filter((value) => value === outcome).length;

        const report: SweepReport = {
          due: due.length,
          failed: count("failed"),
          reconnectRequired: count("reconnectRequired"),
          refreshed: count("refreshed"),
          unavailable: count("unavailable"),
        };

        return report;
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("The token refresh sweep failed", cause).pipe(
            Effect.as<SweepReport>({
              due: 0,
              failed: 0,
              reconnectRequired: 0,
              refreshed: 0,
              unavailable: 0,
            })
          )
        ),
        Effect.withSpan("RefreshChannelTokens.sweep")
      );

      return RefreshChannelTokens.of({ refresh, sweep });
    })
  );
}
