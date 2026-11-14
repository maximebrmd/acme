import { countedText } from "peal-contract";
import type { Platform, TargetOptions } from "peal-contract";
import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
  rulesFor,
} from "peal-contract/post-text";
import type { PlatformRules, TextUnit } from "peal-contract/post-text";

// What the composer tells about the text on each channel, counted as the
// server counts it: the contract carries the server's rules.

/** The text's length against one of its platform's limits. */
export interface TextCount {
  readonly length: number;
  readonly maximum: number;
  /** Negative once the text is over the limit. */
  readonly remaining: number;
  readonly unit: TextUnit;
}

/** Something the platform would refuse, besides the text's length. */
export type ChannelProblem =
  | { readonly _tag: "empty" }
  | { readonly _tag: "mediaRequired" }
  // Characters the platform refuses (YouTube: "<" and ">"), in its order.
  | {
      readonly _tag: "forbiddenCharacters";
      readonly characters: readonly string[];
    }
  | {
      readonly _tag:
        | "tooManyHashtags"
        | "tooManyLinks"
        | "tooManyMedia"
        | "tooManyMentions";
      readonly count: number;
      readonly maximum: number;
    };

/** How the post fits a channel's platform. */
export interface ChannelFit {
  /** Every limit of the platform, in the order it lists them. */
  readonly counts: readonly TextCount[];
  readonly platform: Platform;
  readonly problems: readonly ChannelProblem[];
  /**
   * True when the post has text and the format its options choose sends
   * none (a story): the text is then neither counted nor checked.
   */
  readonly textNotSent?: true;
  /** The limit closest to being reached, if the platform has any. */
  readonly tightest: TextCount | undefined;
}

const tooMany = (
  tag: "tooManyHashtags" | "tooManyLinks" | "tooManyMedia" | "tooManyMentions",
  count: number,
  maximum: number | undefined
): readonly ChannelProblem[] =>
  maximum !== undefined && count > maximum
    ? [{ _tag: tag, count, maximum }]
    : [];

/**
 * How `text`, shown with `media` images or videos, fits `platform`, with
 * the `options` it has on the channel, which some platforms count with the
 * text (a Mastodon content warning: `countedText`) and which may choose a
 * format of rules of its own (`rulesFor`): a story's text is not sent, so
 * it is neither counted nor checked.
 */
export const fitOn = (
  platform: Platform,
  text: string,
  media: number,
  options?: TargetOptions,
  // A part after the first follows its own (`partRulesFor`): a comment's.
  rules: PlatformRules = rulesFor(platform, options)
): ChannelFit => {
  const sent = rules.sendsText !== false;
  const counted = countedText(sent ? text : "", options);

  const counts = sent
    ? rules.textLimits.map(({ maximum, unit }): TextCount => {
        const length = measureText(counted, unit);

        return { length, maximum, remaining: maximum - length, unit };
      })
    : [];

  const [tightest] = counts.toSorted(
    (left, right) => left.remaining - right.remaining
  );

  const empty: readonly ChannelProblem[] =
    text.trim() === "" && media === 0 ? [{ _tag: "empty" }] : [];

  const mediaRequired: readonly ChannelProblem[] =
    rules.mediaRequired && media === 0 ? [{ _tag: "mediaRequired" }] : [];

  // What goes out: no text at all on a story.
  const checked = sent ? text : "";

  const forbidden = (rules.forbiddenCharacters ?? []).filter((character) =>
    checked.includes(character)
  );

  const fit: ChannelFit = {
    counts,
    platform,
    problems: [
      ...empty,
      ...(forbidden.length > 0
        ? [{ _tag: "forbiddenCharacters" as const, characters: forbidden }]
        : []),
      ...tooMany("tooManyMedia", media, rules.maxMedia),
      ...mediaRequired,
      ...tooMany("tooManyHashtags", countHashtags(checked), rules.maxHashtags),
      ...tooMany("tooManyMentions", countMentions(checked), rules.maxMentions),
      ...tooMany("tooManyLinks", countLinks(checked), rules.maxLinks),
    ],
    tightest,
  };

  return !sent && text.trim() !== "" ? { ...fit, textNotSent: true } : fit;
};

/** Whether the platform would take the post as it is. */
export const fits = (fit: ChannelFit): boolean =>
  fit.problems.length === 0 &&
  fit.counts.every(({ remaining }) => remaining >= 0);
