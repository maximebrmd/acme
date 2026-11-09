import { Duration, Effect, Schedule } from "effect";

import type { TransferFailed } from "#media/transfer-failed.ts";

/** How many times a request to the store is tried before the upload fails. */
export const maxAttempts = 5;

/**
 * Whether trying a request again may work: no answer came (a dropped
 * connection), the store was busy (408, 429) or failed (5xx). A refusal,
 * such as an expired URL (403), stays one.
 */
export const isRetryable = ({ status }: TransferFailed): boolean =>
  status === null || status === 408 || status === 429 || status >= 500;

/**
 * The wait before each new try: 1 second, then twice as long each time, up
 * to 16 seconds, give or take a fifth so that the parts of one upload, and
 * the uploads of many people, do not all come back at once.
 */
export const retrySchedule = Schedule.min([
  Schedule.exponential(Duration.seconds(1)),
  Schedule.spaced(Duration.seconds(16)),
]).pipe(
  Schedule.jittered,
  Schedule.upTo({ times: maxAttempts - 1 }),
  Schedule.setInputType<TransferFailed>(),
  Schedule.while(({ input }) => isRetryable(input))
);

/** A request to the store, tried again while it may still work. */
export const withRetry = <A, R>(
  send: Effect.Effect<A, TransferFailed, R>
): Effect.Effect<A, TransferFailed, R> =>
  send.pipe(Effect.retry(retrySchedule));
