import { Schema } from "effect";

// Every channel notice names the account, as its platform and handle.
const account = {
  handle: Schema.NonEmptyString,
  platform: Schema.NonEmptyString,
};

/**
 * Something a channel needs from the members who manage a workspace's
 * channels. Stored as events and rendered in each reader's language.
 */
export const ChannelNoticeSchema = Schema.Union([
  // The token stopped working: nothing is posted until it is reconnected.
  Schema.TaggedStruct("ChannelReconnectRequired", account),
  // The token cannot be renewed and expires at `expiresAt`.
  Schema.TaggedStruct("ChannelReconnectSoon", {
    ...account,
    expiresAt: Schema.DateTimeUtc,
  }),
]);

export type ChannelNotice = typeof ChannelNoticeSchema.Type;
