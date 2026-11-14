import { Option } from "effect";
import type { DateTime } from "effect";

import type { InboxMessagePlatform } from "#shared/domain/inbox-message-platform.ts";

/**
 * Whether the account may still answer a conversation, and until when:
 * `closesAt` none while no rule closes it.
 */
export interface ReplyWindow {
  readonly closesAt: Option.Option<DateTime.Utc>;
  readonly open: boolean;
}

const alwaysOpen: ReplyWindow = { closesAt: Option.none(), open: true };

const shut: ReplyWindow = { closesAt: Option.none(), open: false };

// Each platform's rule, from when the person last wrote, at `now`.
const windows: Readonly<
  Record<
    InboxMessagePlatform,
    (
      lastIncomingAt: Option.Option<DateTime.Utc>,
      now: DateTime.Utc
    ) => ReplyWindow
  >
> = {
  // Neither sets a window: a conversation stays open.
  bluesky: () => alwaysOpen,
  mastodon: () => alwaysOpen,
};

/**
 * The window in which a platform lets the account answer someone who
 * wrote to it, from when they last wrote (`lastIncomingAt`), at `now`.
 * Nobody else wrote yet: the window is shut, as Peal never makes a first
 * contact. Mastodon and Bluesky set no limit past that. A platform that answers only within
 * hours of a person's message (Meta's 24 hours, and 7 days for a person's
 * answer) brings its rule here.
 */
export const replyWindowOf = (
  platform: InboxMessagePlatform,
  lastIncomingAt: Option.Option<DateTime.Utc>,
  now: DateTime.Utc
): ReplyWindow =>
  Option.isNone(lastIncomingAt) ? shut : windows[platform](lastIncomingAt, now);
