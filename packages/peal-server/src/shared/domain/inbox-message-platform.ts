import { Schema } from "effect";

/**
 * The platforms whose direct messages the inbox reads and answers, where
 * the server's operator turned them on (`PEAL_INBOX_MESSAGES`): Mastodon,
 * whose direct messages are statuses of `direct` visibility listed by
 * `/api/v1/conversations`, and Bluesky, whose chat service
 * (`chat.bsky.convo.*`) the account's PDS proxies. Neither needs a review
 * by the platform. Messages are private correspondence, so a server reads
 * none until its operator says so.
 */
export const InboxMessagePlatformSchema = Schema.Literals([
  "mastodon",
  "bluesky",
]);

export type InboxMessagePlatform = typeof InboxMessagePlatformSchema.Type;

/** The platforms a server reads direct messages on. */
export type InboxMessagePlatforms = ReadonlySet<InboxMessagePlatform>;
