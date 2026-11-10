import { Context, DateTime, Effect, Layer } from "effect";

import {
  countRetentionSeconds,
  standingOf,
  windowStart,
} from "#activity/domain/rate-limit.ts";
import type { LimitStanding } from "#activity/domain/rate-limit.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { RequestCounts } from "./request-counts.ts";
import { RequestPolicy } from "./request-policy.ts";
import { SubjectDigest } from "./subject-digest.ts";

/**
 * The limit on how many requests a credential sends: each request is
 * counted before it is handled, refused or not, so a client that keeps
 * sending past the limit keeps being refused until its window ends.
 */
export class RequestLimiter extends Context.Service<
  RequestLimiter,
  {
    /**
     * Counts a request for `subject` (a key, or an application acting for
     * a user) and says where it stands.
     */
    readonly admit: (
      subject: string
    ) => Effect.Effect<LimitStanding, DatabaseError>;
    /** Deletes the counts no window reads any more. */
    readonly purge: Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/activity/application/RequestLimiter") {
  static readonly layer = Layer.effect(
    RequestLimiter,
    Effect.gen(function* requestLimiter() {
      const counts = yield* RequestCounts;
      const policy = yield* RequestPolicy;
      const digestOf = yield* SubjectDigest;

      return RequestLimiter.of({
        admit: Effect.fn("RequestLimiter.admit")(function* admit(subject) {
          const now = yield* DateTime.now;
          const digest = yield* digestOf(subject);
          const count = yield* counts.count(digest, windowStart(policy, now));

          return standingOf(policy, count, now);
        }),
        purge: Effect.gen(function* purge() {
          const now = yield* DateTime.now;

          return yield* counts.purge(
            DateTime.subtract(now, { seconds: countRetentionSeconds })
          );
        }),
      });
    })
  );
}
