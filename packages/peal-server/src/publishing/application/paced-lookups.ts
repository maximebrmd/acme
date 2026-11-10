import { DateTime, Duration, Effect, Layer, Ref } from "effect";

import {
  lookupAnswerLifetime,
  lookupRunsPerMinute,
} from "#publishing/domain/lookup.ts";
import type { LookupQuery, LookupResult } from "#publishing/domain/lookup.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";

import { PlatformLookups } from "./platform-lookups.ts";

interface Answer {
  readonly at: DateTime.Utc;
  readonly result: LookupResult;
}

interface Pace {
  /** The answers kept, by channel and query, oldest first. */
  readonly answers: ReadonlyMap<string, Answer>;
  /** When each channel's lookups reached its platform, within the minute. */
  readonly runs: ReadonlyMap<ChannelId, readonly DateTime.Utc[]>;
}

// What becomes of a lookup: the answer kept for it, a run of its own, or
// a wait until its channel may run one again.
type Admission =
  | { readonly _tag: "kept"; readonly result: LookupResult }
  | { readonly _tag: "paced"; readonly retryAfter: Duration.Duration }
  | { readonly _tag: "run" };

const minute = Duration.minutes(1);

// How many answers one process keeps at most: past it, the oldest go.
const mostAnswers = 1000;

// A query written the same whenever it is the same.
const keyOf = (channelId: ChannelId, query: LookupQuery) =>
  `${channelId}:${JSON.stringify(query)}`;

const since = (now: DateTime.Utc, age: Duration.Duration) =>
  DateTime.subtractDuration(now, age);

// What is still worth keeping at `now`.
const current = (pace: Pace, now: DateTime.Utc): Pace => ({
  answers: new Map(
    [...pace.answers].filter(([, { at }]) =>
      DateTime.isGreaterThan(at, since(now, lookupAnswerLifetime))
    )
  ),
  runs: new Map(
    [...pace.runs].flatMap(([channelId, times]) => {
      const recent = times.filter((time) =>
        DateTime.isGreaterThan(time, since(now, minute))
      );

      return recent.length === 0 ? [] : [[channelId, recent] as const];
    })
  ),
});

/**
 * `lookups`, paced: each run spends some of what a platform allows this
 * server, so a channel's lookups reach its platform `lookupRunsPerMinute`
 * times a minute at most, and an answer is given again to the same query
 * on the same channel for `lookupAnswerLifetime`, without asking. Past the
 * pace, a lookup fails as `RateLimited` with when to ask again, as when the
 * platform itself asks to slow down. Only answers are kept, never a
 * failure, in this process: a server beside it paces its own.
 */
export const pacedLookups = <E, R>(
  lookups: Layer.Layer<PlatformLookups, E, R>
) =>
  Layer.effect(
    PlatformLookups,
    Effect.gen(function* PacedLookups() {
      const platforms = yield* PlatformLookups;

      const state = yield* Ref.make<Pace>({
        answers: new Map(),
        runs: new Map(),
      });

      // The answer kept for the query, or the run it now takes, or how long
      // until the channel may run one again.
      const admit = (channelId: ChannelId, key: string, now: DateTime.Utc) =>
        Ref.modify(state, (before): readonly [Admission, Pace] => {
          const pace = current(before, now);
          const kept = pace.answers.get(key);

          if (kept !== undefined) {
            return [{ _tag: "kept", result: kept.result }, pace];
          }

          const recent = pace.runs.get(channelId) ?? [];
          const [oldest] = recent;

          if (recent.length >= lookupRunsPerMinute && oldest !== undefined) {
            return [
              {
                _tag: "paced",
                retryAfter: DateTime.distance(
                  now,
                  DateTime.addDuration(oldest, minute)
                ),
              },
              pace,
            ];
          }

          return [
            { _tag: "run" },
            {
              answers: pace.answers,
              runs: new Map([...pace.runs, [channelId, [...recent, now]]]),
            },
          ];
        });

      const keep = (key: string, result: LookupResult, at: DateTime.Utc) =>
        Ref.update(state, (pace) => {
          const answers = [...pace.answers, [key, { at, result }] as const];

          return {
            answers: new Map(answers.slice(-mostAnswers)),
            runs: pace.runs,
          };
        });

      const run = Effect.fn("PacedLookups.run")(function* run(
        channelId: ChannelId,
        query: LookupQuery
      ) {
        const now = yield* DateTime.now;
        const key = keyOf(channelId, query);
        const admitted = yield* admit(channelId, key, now);

        if (admitted._tag === "kept") {
          return admitted.result;
        }

        if (admitted._tag === "paced") {
          return yield* new RateLimited({
            code: "lookupPace",
            retryAfter: admitted.retryAfter,
          });
        }

        const result = yield* platforms.run(channelId, query);

        yield* keep(key, result, now);

        return result;
      });

      return PlatformLookups.of({ run });
    })
  ).pipe(Layer.provide(lookups));
