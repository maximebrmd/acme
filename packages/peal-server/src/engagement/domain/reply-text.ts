import { Option } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

import type { CommentAuthor } from "./comment.ts";

/** The longest reply a member may write, whatever the platform takes. */
export const maxReplyLength = 5000;

const mentions = (text: string, handle: string): boolean =>
  text.toLowerCase().includes(`@${handle.toLowerCase()}`);

/**
 * The text that goes out for a reply a member wrote. On Mastodon a reply
 * reaches the person it answers only when it mentions them, which every
 * Mastodon client writes for its user: Peal puts the mention first unless
 * the member already wrote it. Elsewhere the text goes out as written. The
 * platform's length rule applies to what goes out.
 */
export const outgoingText = (
  platform: Platform,
  author: Option.Option<CommentAuthor>,
  text: string
): string => {
  const written = text.trim();

  if (platform !== "mastodon") {
    return written;
  }

  return Option.match(author, {
    onNone: () => written,
    onSome: ({ handle }) =>
      handle === "" || mentions(written, handle)
        ? written
        : `@${handle} ${written}`,
  });
};
