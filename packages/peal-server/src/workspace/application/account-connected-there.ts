import { Schema } from "effect";

/**
 * The workspace a channel is moved to has a channel of its account
 * (`channelId`), or is the workspace it is in.
 */
export class AccountConnectedThere extends Schema.TaggedError<AccountConnectedThere>()(
  "AccountConnectedThere",
  { channelId: Schema.String }
) {}
