import { Schema } from "effect";

/**
 * Nothing can be read or sent on the channel:
 *
 * - `disconnected`: it left the workspace.
 * - `paused`: it is turned off or needs reconnecting; it may work again.
 * - `unsupported`: Peal reads no comments on its platform.
 */
export class ChannelUnreadable extends Schema.TaggedError<ChannelUnreadable>()(
  "ChannelUnreadable",
  {
    reason: Schema.Literals(["disconnected", "paused", "unsupported"]),
  }
) {}
