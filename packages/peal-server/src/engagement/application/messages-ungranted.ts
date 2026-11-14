import { Schema } from "effect";

/**
 * The channel's account no longer grants what reading its direct messages
 * takes, though they were turned on with it: it was signed in again
 * without asking for them (Bluesky's chat, when the account was connected
 * again rather than reconnected). Its messages are turned off.
 */
export class MessagesUngranted extends Schema.TaggedError<MessagesUngranted>()(
  "MessagesUngranted",
  {}
) {}
