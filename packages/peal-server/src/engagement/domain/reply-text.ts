import { Option } from "effect";

import type { Platform } from "#shared/domain/platform.ts";

import type { CommentAuthor } from "./comment.ts";

/** The longest reply a member may write, whatever the platform takes. */
export const maxReplyLength = 5000;

// A letter, a digit or an underscore: what a handle is made of, with the
// dots and hyphens between them.
const inHandle = (character: string | undefined): boolean =>
  character !== undefined && /^[\p{L}\p{N}_]$/u.test(character);

// Whether the mention found at `start` is the whole of one: "@bob" is not
// mentioned by "@bobby", by "@bob@other.example", by "@bob.smith", nor by
// an address such as "x@bob".
const whole = (text: string, start: number, end: number): boolean => {
  const after = text.at(end);

  return (
    !(start > 0 && inHandle(text.at(start - 1))) &&
    !inHandle(after) &&
    after !== "@" &&
    !((after === "." || after === "-") && inHandle(text.at(end + 1)))
  );
};

const mentions = (text: string, handle: string): boolean => {
  const within = text.toLowerCase();
  const mention = `@${handle.toLowerCase()}`;

  for (
    let start = within.indexOf(mention);
    start !== -1;
    start = within.indexOf(mention, start + 1)
  ) {
    if (whole(within, start, start + mention.length)) {
      return true;
    }
  }

  return false;
};

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
