import { Schema } from "effect";

/**
 * What became of an item Peal read: a post was made from it (`made`), a
 * draft was made instead of the queue's post it was meant for
 * (`heldBack`, with why), nothing was made (`skipped`, with why), its
 * post is being sent (`claimed`), or its send was never confirmed and is
 * not tried again (`abandoned`). Stored: add a member, never rename or
 * remove one.
 */
export const FeedItemOutcomeSchema = Schema.Literals([
  "made",
  "heldBack",
  "skipped",
  "claimed",
  "abandoned",
]);

export type FeedItemOutcome = typeof FeedItemOutcomeSchema.Type;

/**
 * Why an item was skipped: the feed held it when it was added, or when
 * its address changed or it was resumed (`existing`), more items came
 * than a run or a day makes (`tooMany`), or the template wrote nothing
 * from it (`empty`); or why one was held back as a draft: what the queue
 * refused (`contentRejected`, `planLimit`, `queueFull`, `noChannels`,
 * `duplicate`). Stored: add a member, never rename or remove one.
 */
export const FeedItemReasonSchema = Schema.Literals([
  "existing",
  "tooMany",
  "empty",
  "contentRejected",
  "planLimit",
  "queueFull",
  "noChannels",
  "duplicate",
]);

export type FeedItemReason = typeof FeedItemReasonSchema.Type;
