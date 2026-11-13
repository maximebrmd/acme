import { Effect, Schema } from "effect";

import { isWithoutNul } from "./post-text.ts";

/**
 * The most choices a poll keeps: no platform Peal sends one to takes more
 * (X, Mastodon's default and Threads: 4).
 */
export const maxPollChoices = 4;

/**
 * The longest a choice is kept, in UTF-16 code units: above every
 * platform's limit (Mastodon's default is 50 characters), it only bounds
 * what a draft stores. Each platform's own limit is checked when the post
 * is scheduled.
 */
export const maxPollChoiceLength = 200;

/**
 * The longest a poll is kept open, in minutes: Mastodon's default
 * `max_expiration`, 2,629,746 seconds, the longest any platform Peal sends
 * a poll to takes. Each platform's own bounds are checked when the post is
 * scheduled.
 */
export const maxPollDurationMinutes = 43_829;

/** One answer a poll offers. */
export const PollChoiceSchema = Schema.String.check(
  Schema.isMaxLength(maxPollChoiceLength),
  isWithoutNul
);

/**
 * A poll the post asks its readers, on the platforms that take one with a
 * post (`PollRules`): its choices, in order, how long it stays open, and
 * whether a reader may pick several. The post's text is its question. It
 * goes with the post's first part only, and as a draft it may be
 * unfinished: scheduling checks it against each platform.
 */
export class Poll extends Schema.Class<Poll>(
  "peal-server/publishing/domain/Poll"
)({
  choices: Schema.Array(PollChoiceSchema).check(
    Schema.isMaxLength(maxPollChoices)
  ),
  durationMinutes: Schema.Int.check(
    Schema.isBetween({ maximum: maxPollDurationMinutes, minimum: 1 })
  ),
  multipleChoice: Schema.Boolean.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(false)),
    Schema.withConstructorDefault(Effect.succeed(false))
  ),
}) {}
