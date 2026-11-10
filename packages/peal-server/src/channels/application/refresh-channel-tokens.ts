import {
  Context,
  DateTime,
  Duration,
  Effect,
  Function,
  Layer,
  Metric,
  Option,
  Ref,
  Schedule,
} from "effect";

import { markRefreshNeeded, renewToken } from "#channels/domain/channel.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { platforms } from "#channels/domain/platform.ts";
import {
  isRefreshDue,
  refreshDueBefore,
  tokenLifetimeOf,
} from "#channels/domain/token-policy.ts";
import type { RefreshSweep } from "#channels/domain/token-policy.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";

import { ChannelLocks } from "./channel-locks.ts";
import { ChannelNotices } from "./channel-notices.ts";
import { ChannelRepository, refreshCursorOf } from "./channel-repository.ts";
import type { RefreshCursor, RefreshCutoff } from "./channel-repository.ts";
import { decryptTokens, encryptTokens } from "./channel-tokens.ts";
import { PlatformAuthorizers } from "./platform-authorizer.ts";
import type {
  PlatformAuthorizer,
  StoredTokens,
} from "./platform-authorizer.ts";
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
  /** Channels the run took, refreshed or not. */
  readonly due: number;
  readonly failed: number;
  /**
   * Channels still due when the run stopped at its budget, which the next
   * run takes; none when it finished.
   */
  readonly left: number;
  readonly reconnectRequired: number;
  readonly refreshed: number;
  readonly unavailable: number;
}

// Channels refreshed at once: refreshes wait on platforms, not on Peal.
// Each holds a channel lock, of which a process holds four at a time
// (`sqlChannelLocks`): the sweep leaves one free, so a post whose token
// must be renewed never queues behind it.
const concurrency = 3;

// Channels read from the database at a time. A run takes page after page
// until none is due: it has no cap that would leave channels behind.
const pageSize = 100;

/** How long the last refresh run took, in seconds. */
export const tokenSweepDuration = Metric.gauge(
  "peal.channels.token_sweep.duration",
  {
    description: "How long the last token refresh run took, in seconds",
  }
);

/**
 * The channels the last refresh run left due because it ran out of time:
 * 0 while runs finish. Above 0 run after run, tokens are renewed later
 * than their policy says.
 */
export const tokenSweepLeft = Metric.gauge("peal.channels.token_sweep.left", {
  description:
    "Channels still due for a token refresh when the last run stopped at its budget",
});

/** Refresh runs that stopped at their budget with channels still due. */
export const tokenSweepsUnfinished = Metric.counter(
  "peal.channels.token_sweep.unfinished",
  {
    description: "Token refresh runs that could not finish within their budget",
    incremental: true,
  }
);

// A refresh that rotated the token must be saved, or the session is lost:
// the save is retried a few times before giving up.
const saveRetry = Schedule.exponential("200 millis");

const saveRetries = 3;

// The longest a refresh may wait on the platform: past what an answer takes,
// headers and body, short of how long another refresh waits for the lock.
const renewalTimeout = Duration.seconds(45);

// How a run dealt with a channel: what refreshing it came to, that it
// failed unexpectedly, or that the run was out of time before its turn.
type Swept = RefreshOutcome | "failed" | "left";

interface Locked {
  readonly outcome: RefreshOutcome;
  // The channel as marked, when it now needs reconnecting.
  readonly needsReconnect: Option.Option<Channel>;
}

const done = (outcome: RefreshOutcome): Locked => ({
  needsReconnect: Option.none(),
  outcome,
});

// Whether the channel comes no later than `until` in the order the due
// channels are listed in: by expiry, then id, as Postgres compares them.
const withinLeg = (channel: Channel, until: Option.Option<RefreshCursor>) =>
  Option.match(
    Option.zipWith(refreshCursorOf(channel), until, (at, end) => {
      const order = DateTime.Order(at.expiresAt, end.expiresAt);

      return order < 0 || (order === 0 && at.channelId <= end.channelId);
    }),
    { onNone: () => true, onSome: (within) => within }
  );

/**
 * Renews the tokens that only a refresh keeps working, through each
 * platform's authorizer and under each channel's lock, so a rotating refresh
 * token is never used twice. A token a call needs is renewed by that call
 * (`ChannelAccess`), sweep or no sweep: the sweep is for the channels
 * nothing calls, whose token would otherwise lapse (renewed ahead of its
 * expiry) or whose refresh token would go stale (kept alive). A refresh the platform refuses for good marks the channel
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
    /**
     * Refreshes every channel due now, a few at a time, those whose token
     * is about to lapse before those only kept alive, for at most `budget`:
     * past it, it starts no refresh and says how many channels it left.
     * The run after one that stopped starts where it stopped, then comes
     * back to the channels before, so channels whose platform hangs never
     * keep the same others waiting. Never fails.
     */
    readonly sweep: (options: {
      readonly budget: Duration.Duration;
    }) => Effect.Effect<SweepReport>;
  }
>()("peal-server/channels/application/RefreshChannelTokens") {
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

      // Asks the platform for new tokens and saves them. A rotating refresh
      // token stops working once the platform has it, so from then on the
      // refresh runs to its save: a sweep stopped meanwhile (a shutdown)
      // waits for it rather than lose the session. The platform call keeps
      // its own timeout.
      const renewAndSave = Effect.fn("RefreshChannelTokens.renewAndSave")(
        function* renewAndSave(
          channel: Channel,
          tokens: StoredTokens,
          authorizer: PlatformAuthorizer
        ) {
          const renewed = yield* authorizer.refresh(channel, tokens).pipe(
            Effect.timeoutOrElse({
              duration: renewalTimeout,
              orElse: () => Effect.fail(new PlatformUnavailable()),
            }),
            Effect.result
          );

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
        },
        Effect.uninterruptible
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

          return yield* renewAndSave(channel, tokens.value, authorizer);
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

              const authorizer = authorizers.for(
                channel.platform,
                channel.connection
              );

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

      // The platforms' cutoffs at `now`, from the authorizer that connects
      // each: for Instagram, Instagram Login's, whose tokens alone renew;
      // channels whose tokens never expire are not due whatever the cutoff.
      // Those renewed ahead of their expiry come apart from those kept
      // alive: the first lapse if the run is late, the second have weeks.
      const cutoffsAt = (now: DateTime.Utc) => {
        const of = (sweep: RefreshSweep["_tag"]): readonly RefreshCutoff[] =>
          platforms.flatMap((platform) =>
            Option.toArray(
              authorizers.for(platform).pipe(
                Option.filter(
                  ({ policy }) =>
                    policy.refresh._tag === "refreshToken" &&
                    policy.refresh.sweep._tag === sweep
                ),
                Option.flatMap(({ policy }) => refreshDueBefore(policy, now)),
                Option.map((before) => ({ before, platform }))
              )
            )
          );

        return { ahead: of("beforeExpiry"), idle: of("keepAlive") };
      };

      // Refreshes the channel unless the run is out of time: it then
      // starts nothing more, and waits only for the refreshes under way.
      const refreshBy = (deadline: DateTime.Utc) => (channel: Channel) =>
        DateTime.now.pipe(
          Effect.flatMap((now): Effect.Effect<Swept> =>
            DateTime.isGreaterThanOrEqualTo(now, deadline)
              ? Effect.succeed("left")
              : refresh(channel.id).pipe(
                  Effect.catchCause((cause) =>
                    Effect.logWarning(
                      "Refreshing a channel failed",
                      cause
                    ).pipe(
                      Effect.annotateLogs({ channelId: channel.id }),
                      Effect.as<Swept>("failed")
                    )
                  )
                )
          )
        );

      // Where the last run of each sweep stopped at its budget, in this
      // process: the next one starts after it. Without it, channels whose
      // platform hangs, due first run after run, would take every run
      // whole, and those after them would lapse unrefreshed.
      const stoppedAt = {
        ahead: yield* Ref.make(Option.none<RefreshCursor>()),
        idle: yield* Ref.make(Option.none<RefreshCursor>()),
      };

      // The channels due before the cutoffs that come after `from`,
      // soonest first, a page at a time, up to `until` when given. Stops
      // at the deadline, and says after which channel.
      const sweepLeg = Effect.fn("RefreshChannelTokens.sweepLeg")(
        function* sweepLeg(
          cutoffs: readonly RefreshCutoff[],
          deadline: DateTime.Utc,
          from: Option.Option<RefreshCursor>,
          until: Option.Option<RefreshCursor>
        ) {
          const outcomes: Swept[] = [];
          let after = from;

          while (cutoffs.length > 0) {
            const listed = yield* channels.dueForRefresh({
              after,
              cutoffs,
              limit: pageSize,
            });

            const page = listed.filter((channel) => withinLeg(channel, until));

            const swept = yield* Effect.forEach(page, refreshBy(deadline), {
              concurrency,
            });

            outcomes.push(...swept);

            // The run is out of time: the next one starts after the last
            // channel this one took.
            if (swept.includes("left")) {
              const taken = page[swept.indexOf("left") - 1];

              return {
                outcomes,
                stopped: Option.some(
                  taken === undefined
                    ? after
                    : Option.orElse(
                        refreshCursorOf(taken),
                        Function.constant(after)
                      )
                ),
              };
            }

            after = Option.flatMap(
              Option.fromUndefinedOr(listed.at(-1)),
              refreshCursorOf
            );

            if (
              listed.length < pageSize ||
              page.length < listed.length ||
              Option.isNone(after)
            ) {
              break;
            }
          }

          return {
            outcomes,
            stopped: Option.none<Option.Option<RefreshCursor>>(),
          };
        }
      );

      // Every channel due before the cutoffs, each once: those after where
      // the last run stopped, then, from the soonest due, those up to
      // there. A channel whose platform did not answer stays due, and is
      // tried again by the next run, not this one. Stops at the deadline.
      const sweepDue = Effect.fn("RefreshChannelTokens.sweepDue")(
        function* sweepDue(
          cutoffs: readonly RefreshCutoff[],
          deadline: DateTime.Utc,
          resume: Ref.Ref<Option.Option<RefreshCursor>>
        ) {
          const from = yield* Ref.get(resume);
          const rest = yield* sweepLeg(cutoffs, deadline, from, Option.none());

          if (Option.isSome(rest.stopped) || Option.isNone(from)) {
            yield* Ref.set(resume, Option.flatten(rest.stopped));

            return rest.outcomes;
          }

          const start = yield* sweepLeg(cutoffs, deadline, Option.none(), from);

          yield* Ref.set(resume, Option.flatten(start.stopped));

          return [...rest.outcomes, ...start.outcomes];
        }
      );

      const sweepWithin = Effect.fn("RefreshChannelTokens.sweep")(
        function* sweepWithin(budget: Duration.Duration) {
          const startedAt = yield* DateTime.now;
          const deadline = DateTime.addDuration(startedAt, budget);
          const cutoffs = cutoffsAt(startedAt);

          const ahead = yield* sweepDue(
            cutoffs.ahead,
            deadline,
            stoppedAt.ahead
          );

          const idle = ahead.includes("left")
            ? []
            : yield* sweepDue(cutoffs.idle, deadline, stoppedAt.idle);

          const outcomes = [...ahead, ...idle];
          const unfinished = outcomes.includes("left");

          // What a run that stopped leaves: everything still due, the
          // channels it could not refresh included.
          const left = unfinished
            ? yield* channels.countDueForRefresh([
                ...cutoffs.ahead,
                ...cutoffs.idle,
              ])
            : 0;

          const count = (outcome: Swept) =>
            outcomes.filter((value) => value === outcome).length;

          const report: SweepReport = {
            due: outcomes.length - count("left"),
            failed: count("failed"),
            left,
            reconnectRequired: count("reconnectRequired"),
            refreshed: count("refreshed"),
            unavailable: count("unavailable"),
          };

          const took = DateTime.distance(startedAt, yield* DateTime.now);

          yield* Metric.update(tokenSweepDuration, Duration.toSeconds(took));
          yield* Metric.update(tokenSweepLeft, left);

          if (unfinished) {
            yield* Metric.update(tokenSweepsUnfinished, 1);
            yield* Effect.logWarning(
              "The token refresh run could not finish before the next one: the channels left are refreshed by the runs that follow, later than their policy says"
            ).pipe(
              Effect.annotateLogs({
                ...report,
                seconds: Duration.toSeconds(took),
              })
            );
          }

          return report;
        }
      );

      const sweep = (options: { readonly budget: Duration.Duration }) =>
        sweepWithin(options.budget).pipe(
          Effect.catchCause((cause) =>
            Effect.logWarning("The token refresh sweep failed", cause).pipe(
              Effect.as<SweepReport>({
                due: 0,
                failed: 0,
                left: 0,
                reconnectRequired: 0,
                refreshed: 0,
                unavailable: 0,
              })
            )
          )
        );

      return RefreshChannelTokens.of({ refresh, sweep });
    })
  );
}
