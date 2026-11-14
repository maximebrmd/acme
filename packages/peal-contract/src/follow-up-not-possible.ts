import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import {
  ChannelFollowUpsSchema,
  FollowUpRefusalSchema,
} from "./follow-up-rule.ts";

/** The follow-up rule cannot act. */
export class FollowUpNotPossible extends Schema.TaggedError<FollowUpNotPossible>()(
  "FollowUpNotPossible",
  {
    ...errorEnvelope,
    channels: Schema.Array(ChannelFollowUpsSchema),
    reason: FollowUpRefusalSchema,
  },
  {
    description:
      "The rule cannot act, for `reason`: it asks for neither a comment nor a repost (`noAction`), its comment is empty (`emptyComment`), its post was cancelled (`postCancelled`) or goes to no channel (`noChannel`), another rule already follows up all it asks on the post (`alreadyFollowedUp`: stop that one first), nothing of the post is left to publish and no channel it went out on can still be followed up: its seven days passed, it failed, or no channel there carries the rule (`windowPassed`), or (`channels`) no channel can carry what it asks, or its comment is longer than a channel that could carry it takes: `channels` says, for each channel and kind, why not. Nothing was started or changed.",
    httpApiStatus: 422,
  }
) {}
