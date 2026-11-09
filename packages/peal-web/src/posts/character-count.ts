import type { Platform } from "peal-contract";
import {
  countHashtags,
  countLinks,
  countMentions,
  measureText,
  platformRules,
} from "peal-contract/post-text";
import type { TextUnit } from "peal-contract/post-text";

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

/** How `text`, shown with `media` images or videos, fits `platform`. */
export const fitOn = (
  platform: Platform,
  text: string,
  media: number
): ChannelFit => {
  const rules = platformRules[platform];

  const counts = rules.textLimits.map(({ maximum, unit }): TextCount => {
    const length = measureText(text, unit);

    return { length, maximum, remaining: maximum - length, unit };
  });

  const [tightest] = counts.toSorted(
    (left, right) => left.remaining - right.remaining
  );

  const empty: readonly ChannelProblem[] =
    text.trim() === "" && media === 0 ? [{ _tag: "empty" }] : [];

  const mediaRequired: readonly ChannelProblem[] =
    rules.mediaRequired && media === 0 ? [{ _tag: "mediaRequired" }] : [];

  const forbidden = (rules.forbiddenCharacters ?? []).filter((character) =>
    text.includes(character)
  );

  return {
    counts,
    platform,
    problems: [
      ...empty,
      ...(forbidden.length > 0
        ? [{ _tag: "forbiddenCharacters" as const, characters: forbidden }]
        : []),
      ...tooMany("tooManyMedia", media, rules.maxMedia),
      ...mediaRequired,
      ...tooMany("tooManyHashtags", countHashtags(text), rules.maxHashtags),
      ...tooMany("tooManyMentions", countMentions(text), rules.maxMentions),
      ...tooMany("tooManyLinks", countLinks(text), rules.maxLinks),
    ],
    tightest,
  };
};

/** Whether the platform would take the post as it is. */
export const fits = (fit: ChannelFit): boolean =>
  fit.problems.length === 0 &&
  fit.counts.every(({ remaining }) => remaining >= 0);
