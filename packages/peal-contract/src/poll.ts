import { Schema } from "effect";

/** The most choices a poll keeps: no platform Peal sends one to takes more. */
export const maxPollChoices = 4;

/**
 * The longest a choice is kept, in UTF-16 code units: it only bounds what
 * a draft stores. Each platform's limit (`poll` in its capabilities) is
 * checked when the post is scheduled.
 */
export const maxPollChoiceLength = 200;

/**
 * The longest a poll is kept open, in minutes: the longest any platform
 * Peal sends a poll to takes (Mastodon's default, 2,629,746 seconds).
 */
export const maxPollDurationMinutes = 43_829;

/**
 * A poll the post asks its readers with its first part, whose text is the
 * question: its choices, in order; how many minutes it stays open; and
 * whether a reader may pick several (false when left out). It goes where
 * the platform takes one (`poll` in its capabilities: X, Mastodon,
 * Threads); scheduling refuses it anywhere else (`pollNotSupported`), and
 * whatever a platform's bounds refuse (`pollChoiceCount`,
 * `pollChoiceLength`, `pollDurationOutOfRange`, `pollMultipleChoice`,
 * `pollWithMedia`). A draft may hold it unfinished.
 */
export const PollSchema = Schema.Struct({
  choices: Schema.Array(
    Schema.String.check(Schema.isMaxLength(maxPollChoiceLength))
  ).check(Schema.isMaxLength(maxPollChoices)),
  durationMinutes: Schema.Int.check(
    Schema.isBetween({ maximum: maxPollDurationMinutes, minimum: 1 })
  ),
  multipleChoice: Schema.optionalKey(Schema.Boolean),
}).annotate({ identifier: "Poll" });

export type Poll = typeof PollSchema.Type;
