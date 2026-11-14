import { Schema } from "effect";

import { ChannelFollowUpsSchema } from "#publishing/domain/follow-up-ability.ts";

/**
 * The rule cannot act: it asks nothing (`noAction`), its comment is empty
 * once cleaned (`emptyComment`), its post was cancelled (`postCancelled`)
 * or has no channel (`noChannel`), another rule already follows up all it
 * asks on the post (`alreadyFollowedUp`), nothing of the post is left to
 * publish and none of it can still be followed up (`windowPassed`), no channel can carry what it asks, or
 * the comment is too long for a channel that could otherwise carry it
 * (`channels`, each kind with its reason).
 */
export class FollowUpNotPossible extends Schema.TaggedError<FollowUpNotPossible>()(
  "FollowUpNotPossible",
  {
    channels: Schema.Array(ChannelFollowUpsSchema),
    reason: Schema.Literals([
      "noAction",
      "emptyComment",
      "postCancelled",
      "noChannel",
      "alreadyFollowedUp",
      "windowPassed",
      "channels",
    ]),
  }
) {
  override get message(): string {
    return `The follow-up rule cannot act (${this.reason})`;
  }
}
