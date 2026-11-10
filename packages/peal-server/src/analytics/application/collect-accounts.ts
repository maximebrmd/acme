import {
  Context,
  DateTime,
  Duration,
  Effect,
  Layer,
  Metric,
  Option,
} from "effect";

import { tellsSomething } from "#analytics/domain/account-metrics.ts";
import {
  accountPutOff,
  accountRead,
  accountSkipped,
  accountUnsupported,
  followChannel,
} from "#analytics/domain/tracked-channel.ts";
import type { TrackedChannel } from "#analytics/domain/tracked-channel.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId } from "#shared/domain/ids.ts";

import { ConnectedChannels } from "./connected-channels.ts";
import { MetricsReader } from "./metrics-reader.ts";
import { TrackedChannels } from "./tracked-channels.ts";
import type { AccountRead } from "./tracked-channels.ts";

/** What a run of the accounts' collection did. */
export interface AccountsReport {
  /** Channels connected since the last run, now followed. */
  readonly discovered: number;
  /** Channels whose account was read. */
  readonly read: number;
  /** Channels passed over: turned off, or reading nothing Peal may read. */
  readonly skipped: number;
  /** Channels no longer followed: they left their workspace. */
  readonly ended: number;
  /** Channels put off to the next run by their platform. */
  readonly deferred: number;
  /** Channels still due when the run ended. */
  readonly left: number;
}

/** How a run of the accounts' collection is paced. */
export interface AccountPace {
  /** How long after its scheduled time a run starts no more reads. */
  readonly budget: Duration.Duration;
  /** Channels read at the same time, each through its gate. */
  readonly channelConcurrency: number;
  /** Channels taken from the stores at a time. */
  readonly channelsPerPage: number;
}

/**
 * The pace of the accounts' collection: 16 channels at a time, pages of
 * 500, for 40 minutes. The server sets the concurrency from
 * `PEAL_ANALYTICS_CONCURRENCY`, as for posts.
 */
export const AccountPaceRef = Context.Reference<AccountPace>(
  "peal-server/analytics/application/AccountPace",
  {
    defaultValue: () => ({
      budget: Duration.minutes(40),
      channelConcurrency: 16,
      channelsPerPage: 500,
    }),
  }
);

/** How long the last run of the accounts' collection took, in seconds. */
export const accountsDuration = Metric.gauge(
  "peal.analytics.accounts.duration",
  { description: "How long the last accounts collection run took, in seconds" }
);

/**
 * The channels the last run left due: 0 while runs finish. Above 0 run
 * after run, followers are read later than once a day.
 */
export const accountsLeft = Metric.gauge("peal.analytics.accounts.left", {
  description: "Channels still due when the last accounts collection run ended",
});

/** Runs that stopped at their budget with channels still due. */
export const accountsUnfinished = Metric.counter(
  "peal.analytics.accounts.unfinished",
  {
    description:
      "Accounts collection runs that could not finish in their budget",
    incremental: true,
  }
);

type Tally = Omit<AccountsReport, "discovered" | "left">;

const emptyTally: Tally = { deferred: 0, ended: 0, read: 0, skipped: 0 };

// What a channel's turn came to, to be saved with its page.
type Turn =
  | { readonly _tag: "read"; readonly read: AccountRead }
  | { readonly _tag: "skipped"; readonly channel: TrackedChannel }
  | { readonly _tag: "deferred"; readonly channel: TrackedChannel }
  | { readonly _tag: "ended"; readonly channelId: ChannelId }
  | { readonly _tag: "unreached" };

const isPast = (deadline: DateTime.Utc) =>
  DateTime.now.pipe(
    Effect.map((now) => DateTime.isGreaterThanOrEqualTo(now, deadline))
  );

/**
 * Reads each connected channel's account once a day, run by the hourly
 * accounts' collection: it follows the channels connected since the last
 * run, then reads those due, the ones that waited longest first, each
 * through its gate. `at` is the run's scheduled time, which the next reads
 * are counted from, so a channel comes due on the same run each day.
 *
 * A channel whose platform puts the read off waits for the next run,
 * behind those that were not; one turned off, or that did not allow the
 * read, waits a day; one Peal reads nothing on is asked again a week
 * later; one that left its workspace is forgotten, with what was read of
 * it.
 */
export class CollectAccounts extends Context.Service<
  CollectAccounts,
  {
    readonly run: (
      at: DateTime.Utc
    ) => Effect.Effect<AccountsReport, DatabaseError>;
  }
>()("peal-server/analytics/application/CollectAccounts") {
  static readonly layer = Layer.effect(
    CollectAccounts,
    Effect.gen(function* CollectAccountsLive() {
      const connected = yield* ConnectedChannels;
      const tracked = yield* TrackedChannels;
      const reader = yield* MetricsReader;
      const pace = yield* AccountPaceRef;

      // Follows every connected channel not followed yet, a page at a
      // time in the order of their ids, until the run is out of time.
      const discover = Effect.fn("CollectAccounts.discover")(function* discover(
        at: DateTime.Utc,
        deadline: DateTime.Utc
      ) {
        let after = Option.none<ChannelId>();
        let discovered = 0;

        while (!(yield* isPast(deadline))) {
          const page = yield* connected.after(after, pace.channelsPerPage);

          discovered += yield* tracked.follow(
            page.map((channel) => followChannel(channel, at))
          );

          after = Option.fromUndefinedOr(page.at(-1)?.channelId);

          if (page.length < pace.channelsPerPage) {
            break;
          }
        }

        return discovered;
      });

      const turnOf = Effect.fn("CollectAccounts.channel")(function* turnOf(
        channel: TrackedChannel,
        at: DateTime.Utc,
        deadline: DateTime.Utc
      ) {
        if (yield* isPast(deadline)) {
          const unreached: Turn = { _tag: "unreached" };

          return unreached;
        }

        const outcome = yield* reader
          .account({
            channelId: channel.channelId,
            workspaceId: channel.workspaceId,
          })
          .pipe(Effect.result);

        if (outcome._tag === "Success") {
          const collectedAt = yield* DateTime.now;

          // A reading that tells nothing keeps nothing: no empty day.
          const turn: Turn = tellsSomething(outcome.success)
            ? {
                _tag: "read",
                read: {
                  channel: accountRead(channel, collectedAt, at),
                  collectedAt,
                  reading: outcome.success,
                },
              }
            : { _tag: "skipped", channel: accountSkipped(channel, at) };

          return turn;
        }

        const { failure } = outcome;

        if (failure._tag === "PlatformUnavailable") {
          const deferred: Turn = {
            _tag: "deferred",
            channel: accountPutOff(channel, at),
          };

          return deferred;
        }

        if (failure.reason === "disconnected") {
          const ended: Turn = { _tag: "ended", channelId: channel.channelId };

          return ended;
        }

        const skipped: Turn = {
          _tag: "skipped",
          channel:
            failure.reason === "unsupported"
              ? accountUnsupported(channel, at)
              : accountSkipped(channel, at),
        };

        return skipped;
      });

      // Reads the channels due, a page at a time, and saves each page in
      // one statement a table. A channel read, passed over or put off is
      // no longer due by `at`, so each page is of other channels.
      const collectDue = Effect.fn("CollectAccounts.due")(function* collectDue(
        at: DateTime.Utc,
        deadline: DateTime.Utc
      ) {
        let total = emptyTally;

        while (!(yield* isPast(deadline))) {
          const page = yield* tracked.due(at, pace.channelsPerPage);

          if (page.length === 0) {
            return { total, unfinished: false };
          }

          const turns = yield* Effect.forEach(
            page,
            (channel) => turnOf(channel, at, deadline),
            { concurrency: pace.channelConcurrency }
          );

          const reads = turns.flatMap((turn) =>
            turn._tag === "read" ? [turn.read] : []
          );

          const waiting = turns.flatMap((turn) =>
            turn._tag === "skipped" || turn._tag === "deferred" ? [turn] : []
          );

          const ended = turns.flatMap((turn) =>
            turn._tag === "ended" ? [turn.channelId] : []
          );

          yield* tracked.saveReadings(reads);
          yield* tracked.saveSchedules(waiting.map(({ channel }) => channel));
          yield* tracked.forget(ended);

          total = {
            deferred:
              total.deferred +
              waiting.filter(({ _tag }) => _tag === "deferred").length,
            ended: total.ended + ended.length,
            read: total.read + reads.length,
            skipped:
              total.skipped +
              waiting.filter(({ _tag }) => _tag === "skipped").length,
          };

          if (turns.some(({ _tag }) => _tag === "unreached")) {
            return { total, unfinished: true };
          }
        }

        return { total, unfinished: (yield* tracked.countDue(at)) > 0 };
      });

      const run = Effect.fn("CollectAccounts.run")(function* run(
        at: DateTime.Utc
      ) {
        const startedAt = yield* DateTime.now;
        const deadline = DateTime.addDuration(at, pace.budget);
        const discovered = yield* discover(at, deadline);
        const { total, unfinished } = yield* collectDue(at, deadline);
        const left = yield* tracked.countDue(at);
        const report: AccountsReport = { discovered, ...total, left };
        const took = DateTime.distance(startedAt, yield* DateTime.now);

        yield* Metric.update(accountsDuration, Duration.toSeconds(took));
        yield* Metric.update(accountsLeft, left);

        if (unfinished) {
          yield* Metric.update(accountsUnfinished, 1);
          yield* Effect.logWarning(
            "The accounts collection could not finish before the next run: the channels left are read by the runs that follow, later than once a day. Raise PEAL_ANALYTICS_CONCURRENCY if platforms answer"
          ).pipe(
            Effect.annotateLogs({
              ...report,
              seconds: Duration.toSeconds(took),
            })
          );
        }

        return report;
      });

      return CollectAccounts.of({ run });
    })
  );
}
