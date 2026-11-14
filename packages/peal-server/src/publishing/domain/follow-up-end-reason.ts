import { Schema } from "effect";

/**
 * Why a follow-up rule ended: a member stopped it (`stopped`), every
 * follow-up it armed on its post ended (`completed`), whoever started it
 * can no longer publish (`starterGone`), or its channel was disconnected
 * (`channelGone`). Stored: add a member, never rename or remove one.
 */
export const FollowUpEndReasonSchema = Schema.Literals([
  "stopped",
  "completed",
  "starterGone",
  "channelGone",
]);

export type FollowUpEndReason = typeof FollowUpEndReasonSchema.Type;
