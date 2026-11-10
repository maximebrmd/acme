import { maxInboxReplyLength } from "peal-contract";
import type { Platform } from "peal-contract";
import { measureText, platformRules } from "peal-contract/post-text";
import type { TextUnit } from "peal-contract/post-text";

// What a reply's box tells while a member writes: the text that would go
// out, counted as its platform counts posts. The server checks again.

/** How a reply fits the platform it goes out on. */
export interface ReplyFit {
  /** Whether there is nothing to send. */
  readonly empty: boolean;
  /** How long the text that goes out is, in `unit`. */
  readonly length: number;
  /** The most the platform takes, in `unit`. */
  readonly maximum: number;
  /** The mention Peal puts first, when the text lacks it. */
  readonly mention: string | null;
  /** The text as it goes out. */
  readonly outgoing: string;
  /** Negative once the reply is over the limit. */
  readonly remaining: number;
  readonly unit: TextUnit;
}

const mentions = (text: string, handle: string): boolean =>
  text.toLowerCase().includes(`@${handle.toLowerCase()}`);

/**
 * The mention Peal puts before a reply: on Mastodon a reply reaches the
 * person it answers only when it mentions them, so theirs goes first unless
 * the text already holds it, in any case. None elsewhere.
 */
export const mentionFor = (
  platform: Platform,
  handle: string | null,
  text: string
): string | null =>
  platform !== "mastodon" ||
  handle === null ||
  handle === "" ||
  mentions(text, handle)
    ? null
    : `@${handle}`;

/** The text that goes out for what a member wrote, as the server writes it. */
export const outgoingText = (
  platform: Platform,
  handle: string | null,
  text: string
): string => {
  const written = text.trim();
  const mention = mentionFor(platform, handle, written);

  return mention === null ? written : `${mention} ${written}`;
};

const count = (measured: string, maximum: number, unit: TextUnit) => {
  const length = measureText(measured, unit);

  return { length, maximum, remaining: maximum - length, unit };
};

/**
 * How `text`, answering the comment of `handle`, fits `platform`: the
 * closest of the platform's limits on what goes out, and of the longest
 * reply the API takes, which it counts on the text as written.
 */
export const replyFit = (
  platform: Platform,
  handle: string | null,
  text: string
): ReplyFit => {
  const written = text.trim();
  const mention = mentionFor(platform, handle, written);
  const outgoing = outgoingText(platform, handle, text);

  const own = count(text, maxInboxReplyLength, "utf16Units");

  const [tightest = own] = [
    ...platformRules[platform].textLimits.map(({ maximum, unit }) =>
      count(outgoing, maximum, unit)
    ),
    own,
  ].toSorted((left, right) => left.remaining - right.remaining);

  return { ...tightest, empty: written === "", mention, outgoing };
};

/** Whether the reply can be sent as it is. */
export const replyFits = (fit: ReplyFit): boolean =>
  !fit.empty && fit.remaining >= 0;
