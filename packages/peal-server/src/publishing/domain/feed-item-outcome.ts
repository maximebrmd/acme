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
 * `duplicate`), or the queue deleted since (`queueGone`). Stored: add a member, never rename or remove one.
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
  "queueGone",
]);

export type FeedItemReason = typeof FeedItemReasonSchema.Type;

/**
 * Why an item's picture was not attached to its post, which went without
 * it: its address is not public (`notPublic`) or did not answer
 * (`unreachable`), the file is too large (`tooLarge`) or not an image
 * Peal takes (`notAnImage`), the plan's storage is full (`storageFull`),
 * the imports are all busy (`busy`), the starter may not upload media
 * (`notAllowed`), or anything else (`failed`). Stored: add a member, never
 * rename or remove one.
 */
export const FeedPictureSkipSchema = Schema.Literals([
  "notPublic",
  "unreachable",
  "tooLarge",
  "notAnImage",
  "storageFull",
  "busy",
  "notAllowed",
  "failed",
]);

export type FeedPictureSkip = typeof FeedPictureSkipSchema.Type;
