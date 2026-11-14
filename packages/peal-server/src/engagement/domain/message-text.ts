import { Option } from "effect";

import type { InboxMessagePlatform } from "#shared/domain/inbox-message-platform.ts";

import type { Participant } from "./conversation.ts";
import { mentions } from "./reply-text.ts";

/** The longest message a member may write, whatever the platform takes. */
export const maxOutgoingMessageLength = 5000;

/**
 * What Bluesky's chat takes in a message: the lexicon's
 * `chat.bsky.convo.defs#messageInput` (`maxGraphemes` 1000, `maxLength`
 * 10000, which atproto lexicons count in UTF-8 bytes).
 */
export const blueskyMessageLimits = { bytes: 10_000, graphemes: 1000 } as const;

const graphemes = new Intl.Segmenter("und", { granularity: "grapheme" });

const encoder = new TextEncoder();

const graphemesIn = (text: string): number => {
  let count = 0;

  for (const _ of graphemes.segment(text)) {
    count += 1;
  }

  return count;
};

/** A limit a message passes, counted as the platform counts. */
export interface MessageOverflow {
  readonly length: number;
  readonly maximum: number;
  readonly unit: string;
}

/**
 * The text that goes out for a message a member wrote. On Mastodon a
 * direct message is a status of `direct` visibility, which reaches only
 * the accounts it mentions: Peal puts the mention of every participant
 * the member did not write first, as Mastodon's own clients do. On
 * Bluesky the text goes out as written, to the conversation.
 */
export const outgoingMessageText = (
  platform: InboxMessagePlatform,
  participants: readonly Participant[],
  text: string
): string => {
  const written = text.trim();

  if (platform !== "mastodon") {
    return written;
  }

  const missing = participants.flatMap(({ handle }) =>
    handle === "" || mentions(written, handle) ? [] : [`@${handle}`]
  );

  return missing.length === 0 ? written : `${missing.join(" ")} ${written}`;
};

/**
 * Bluesky's limits on a message, the first one `text` passes; none on
 * Mastodon, whose status length publishing's text rules check.
 */
export const chatOverflow = (
  platform: InboxMessagePlatform,
  text: string
): Option.Option<MessageOverflow> => {
  if (platform !== "bluesky") {
    return Option.none();
  }

  const counted = graphemesIn(text);

  if (counted > blueskyMessageLimits.graphemes) {
    return Option.some({
      length: counted,
      maximum: blueskyMessageLimits.graphemes,
      unit: "graphemes",
    });
  }

  const bytes = encoder.encode(text).length;

  return bytes > blueskyMessageLimits.bytes
    ? Option.some({
        length: bytes,
        maximum: blueskyMessageLimits.bytes,
        unit: "utf8Bytes",
      })
    : Option.none();
};

// A mention as Mastodon reads one, its `MENTION_RE` (app/models/account.rb,
// read 2026-11-14): `@` not after `=`, `/` or a word character (so not in
// `hello@shop.example`, nor a profile address such as
// `https://host/@name`), a username of `[a-z0-9_]`, with `.` and `-`
// inside, and an optional `@host` of word characters, dots and hyphens.
// Ruby's `[[:word:]]` is letters, marks, numbers and connectors.
const mentionPattern =
  /(?<![=/\p{L}\p{M}\p{N}\p{Pc}])@[a-z0-9_]+(?:[a-z0-9_.-]+[a-z0-9_]+)?(?:@[\p{L}\p{M}\p{N}\p{Pc}.-]+[\p{L}\p{M}\p{N}\p{Pc}]+)?/giu;

/**
 * The mentions in a Mastodon message of accounts outside the
 * conversation: a `direct` status reaches every account it mentions, so
 * one typed in the text would hand the private message to them too. None
 * on Bluesky, whose chat goes to the conversation alone.
 */
export const mentionsOutside = (
  platform: InboxMessagePlatform,
  participants: readonly Participant[],
  text: string
): readonly string[] => {
  if (platform !== "mastodon") {
    return [];
  }

  const handles = new Set(
    participants.map(({ handle }) => handle.toLowerCase())
  );

  return [...text.matchAll(mentionPattern)].flatMap(([mention]) =>
    handles.has(mention.slice(1).toLowerCase()) ? [] : [mention]
  );
};
