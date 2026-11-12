import { Context } from "effect";

import type { InboxPlatforms } from "#shared/domain/inbox-platform.ts";

/**
 * The optional platforms this server reads comments on, as its operator
 * set them (`PEAL_INBOX_PLATFORMS`), read once when it starts: where the
 * sign-ins ask for the comment scopes, what a channel can do in the inbox,
 * and which platforms the inbox calls. None unless the composition root
 * says otherwise.
 */
export const CurrentInboxPlatforms = Context.Reference<InboxPlatforms>(
  "peal-server/shared/application/CurrentInboxPlatforms",
  { defaultValue: () => new Set() }
);
