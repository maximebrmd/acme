import { Schema } from "effect";

/**
 * Why a rule ended: it made every occurrence it was asked for
 * (`completed`), a member stopped it (`stopped`), or Peal could not make
 * the next one: its source post is gone (`sourceGone`), whoever started
 * it can no longer schedule (`starterGone`), none of its channels is left
 * (`noChannels`), the platforms refuse what it would say
 * (`contentRejected`), the month has no room in the plan (`planLimit`),
 * its queue was deleted (`queueGone`) or has no free slot (`queueFull`).
 * Stored: add a member, never rename or remove one.
 */
export const RecyclingEndReasonSchema = Schema.Literals([
  "completed",
  "stopped",
  "sourceGone",
  "starterGone",
  "noChannels",
  "contentRejected",
  "planLimit",
  "queueGone",
  "queueFull",
]);

export type RecyclingEndReason = typeof RecyclingEndReasonSchema.Type;
