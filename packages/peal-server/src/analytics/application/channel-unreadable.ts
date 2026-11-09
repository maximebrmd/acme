import { Schema } from "effect";

/**
 * Nothing can be read on the channel:
 *
 * - `disconnected`: it left the workspace.
 * - `paused`: it is turned off, needs reconnecting, or its server reads
 *   nothing without a token it does not have; it may work again later.
 * - `unsupported`: Acme reads no counts on its platform.
 */
export class ChannelUnreadable extends Schema.TaggedError<ChannelUnreadable>()(
  "ChannelUnreadable",
  {
    reason: Schema.Literals(["disconnected", "paused", "unsupported"]),
  }
) {}
