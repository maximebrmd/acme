import type {
  MediaAttachment,
  Platform,
  PostContent,
  PostPart,
  TargetOptions,
  TextOverride,
} from "peal-contract";
import { maxFollowUps, partRulesFor, rulesFor } from "peal-contract/post-text";
import type { FollowUpKind } from "peal-contract/post-text";

import { fitOn, fits } from "#posts/character-count.ts";

// The parts that follow a post's first, as the composer edits them: a
// thread on the platforms that have threads. Each function returns a new
// list and leaves the one it is given alone.

/** A part being edited: `key` names it while its place changes. */
export interface PartDraft {
  /** The seconds it waits after the part before it went out. */
  readonly delaySeconds: number;
  readonly key: string;
  readonly media: readonly MediaAttachment[];
  /**
   * The text it has instead on some channels, which the API or another
   * client set: the composer shows each one, counts it for its channel,
   * and lets the member change it or go back to the text for all channels.
   */
  readonly overrides: readonly TextOverride[];
  readonly text: string;
}

/** The parts of a post's content, to edit; none for a new post. */
export const partsOf = (
  content: PostContent | undefined
): readonly PartDraft[] =>
  (content?.followUps ?? []).map((part, index) => ({
    ...part,
    key: `stored-${String(index)}`,
  }));

/** How many more parts the post can have. */
export const roomForParts = (parts: readonly PartDraft[]): number =>
  Math.max(0, maxFollowUps - parts.length);

/** The parts with an empty one at the end, named `key`, while there is room. */
export const addPart = (
  parts: readonly PartDraft[],
  key: string
): readonly PartDraft[] =>
  roomForParts(parts) === 0
    ? parts
    : [...parts, { delaySeconds: 0, key, media: [], overrides: [], text: "" }];

/** The parts without this one. */
export const removePart = (
  parts: readonly PartDraft[],
  key: string
): readonly PartDraft[] => parts.filter((part) => part.key !== key);

/**
 * The parts with this one moved `offset` places, earlier when negative, and
 * never past either end.
 */
export const movePart = (
  parts: readonly PartDraft[],
  key: string,
  offset: number
): readonly PartDraft[] => {
  const from = parts.findIndex((part) => part.key === key);
  const moved = parts[from];

  if (moved === undefined) {
    return parts;
  }

  const to = Math.min(Math.max(from + offset, 0), parts.length - 1);

  return parts.toSpliced(from, 1).toSpliced(to, 0, moved);
};

/**
 * The text a part goes out with on a channel: its own there when it has
 * one, as the server sends it, or the text for all channels.
 */
export const partTextOn = (
  part: Pick<PartDraft, "overrides" | "text">,
  channelId: string
): string =>
  part.overrides.find((override) => override.channelId === channelId)?.text ??
  part.text;

/**
 * A part's overrides with the channel's own text changed (its media of its
 * own kept), or, with `null`, without it: the channel then takes the text
 * for all channels.
 */
export const withPartOverride = (
  overrides: readonly TextOverride[],
  channelId: string,
  text: string | null
): readonly TextOverride[] =>
  text === null
    ? overrides.filter((override) => override.channelId !== channelId)
    : overrides.map((override) =>
        override.channelId === channelId ? { ...override, text } : override
      );

/** The parts with `changes` made to this one. */
export const updatePart = (
  parts: readonly PartDraft[],
  key: string,
  changes: Partial<Omit<PartDraft, "key">>
): readonly PartDraft[] =>
  parts.map((part) => (part.key === key ? { ...part, ...changes } : part));

/**
 * The parts as the post's content holds them: in order, each with a text
 * of its own only for the channels the post goes to.
 */
export const followUpsOf = (
  parts: readonly PartDraft[],
  channelIds: readonly string[]
): PostPart[] =>
  parts.map(({ delaySeconds, media, overrides, text }) => ({
    delaySeconds,
    media,
    overrides: overrides.filter(({ channelId }) =>
      channelIds.includes(channelId)
    ),
    text,
  }));

/** Whether a platform takes a post's parts. */
export type PartsTaken =
  // It takes them: as replies in a thread, as comments, or there are none.
  | { readonly _tag: "taken"; readonly kind: FollowUpKind | "none" }
  // It takes a post alone, and would refuse this one.
  | { readonly _tag: "alone" }
  // It takes parts, and fewer than these.
  | { readonly _tag: "tooMany"; readonly maximum: number };

/**
 * What `platform` makes of a post with `count` parts after its first, with
 * the channel's `options`: a story or a reel takes none, and neither does
 * a platform the server sends no parts to (`offered` false: a first
 * comment where it does not read the platform's comments, X where its
 * operator turned threads off, a LinkedIn profile), as its capabilities
 * say with a null `followUps`.
 */
export const partsTaken = (
  platform: Platform,
  count: number,
  options?: TargetOptions,
  offered = true
): PartsTaken => {
  const rules = rulesFor(platform, options).followUps;

  if (count === 0) {
    return { _tag: "taken", kind: "none" };
  }

  if (rules === undefined || !offered) {
    return { _tag: "alone" };
  }

  return count > rules.maximum
    ? { _tag: "tooMany", maximum: rules.maximum }
    : { _tag: "taken", kind: rules.kind };
};

// One, five, fifteen and thirty minutes, one, two, six and twelve hours,
// and a day: the longest a part waits.
const offeredDelays = [
  0, 60, 300, 900, 1800, 3600, 7200, 21_600, 43_200, 86_400,
];

/**
 * The waits a part may be given, in seconds, shortest first, with the one
 * it has when the API gave it another.
 */
export const delayChoices = (current: number): readonly number[] =>
  offeredDelays.includes(current)
    ? offeredDelays
    : [...offeredDelays, current].toSorted((left, right) => left - right);

/**
 * Whether every channel takes the parts that follow: their number, as the
 * server sends them there (`offered`), and each one's text, by a post's
 * rules in a thread and a comment's where they are comments. Their images
 * and videos are checked where they are shown, and again by the server.
 */
export const partsFitOn = <
  C extends { readonly id: string; readonly platform: Platform },
>(
  channels: readonly C[],
  parts: readonly PartDraft[],
  optionsOn: (channelId: string) => TargetOptions | undefined,
  offered: (channel: C) => boolean
): boolean =>
  channels.every(
    (channel) =>
      partsTaken(
        channel.platform,
        parts.length,
        optionsOn(channel.id),
        offered(channel)
      )._tag === "taken" &&
      parts.every((part) =>
        fits(
          fitOn(
            channel.platform,
            partTextOn(part, channel.id),
            part.media.length,
            optionsOn(channel.id),
            partRulesFor(channel.platform, optionsOn(channel.id))
          )
        )
      )
  );
