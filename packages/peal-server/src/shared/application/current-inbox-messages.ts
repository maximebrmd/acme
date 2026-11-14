import { Context } from "effect";

import type { InboxMessagePlatforms } from "#shared/domain/inbox-message-platform.ts";

/**
 * The platforms this server reads direct messages on, as its operator set
 * them (`PEAL_INBOX_MESSAGES`), read once when it starts: whether Bluesky's
 * sign-in asks for the chat scopes, what a channel can do with its
 * conversations, and which platforms the inbox calls for them. None unless
 * the composition root says otherwise.
 */
export const CurrentInboxMessages = Context.Reference<InboxMessagePlatforms>(
  "peal-server/shared/application/CurrentInboxMessages",
  { defaultValue: () => new Set() }
);
