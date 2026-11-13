import { maxPollChoices } from "peal-contract";
import type { Platform, Poll, PostContent, TargetOptions } from "peal-contract";
import { measureText, rulesFor } from "peal-contract/post-text";

// A poll the post asks with its first part, as the composer edits it: the
// post's text is its question. Each function returns a new poll and
// leaves the one it is given alone.

/** A poll being edited. */
export interface PollDraft {
  readonly choices: readonly string[];
  readonly durationMinutes: number;
  readonly multipleChoice: boolean;
}

// The fewest choices the composer shows: every platform asks two.
const fewestChoices = 2;

/** A new poll: two empty choices, open a day. */
export const newPoll = (): PollDraft => ({
  choices: ["", ""],
  durationMinutes: 1440,
  multipleChoice: false,
});

/** The poll a post asks, to edit; none without one, or for a new post. */
export const pollOf = (
  post: { readonly content: PostContent } | undefined
): PollDraft | undefined => {
  const poll = post?.content.poll;

  return poll === undefined || poll === null
    ? undefined
    : {
        choices: poll.choices,
        durationMinutes: poll.durationMinutes,
        multipleChoice: poll.multipleChoice === true,
      };
};

/** What a post's content holds of its poll. */
export interface PollContent {
  readonly poll?: Poll;
}

/**
 * What the content holds of the poll: nothing without one, so a post
 * without stays as it was sent before polls, and several picks only when
 * asked.
 */
export const pollContentOf = (draft: PollDraft | undefined): PollContent => {
  if (draft === undefined) {
    return {};
  }

  const { choices, durationMinutes, multipleChoice } = draft;

  return {
    poll: multipleChoice
      ? { choices, durationMinutes, multipleChoice }
      : { choices, durationMinutes },
  };
};

/** The poll with an empty choice at the end, while there is room. */
export const addChoice = (poll: PollDraft): PollDraft =>
  poll.choices.length >= maxPollChoices
    ? poll
    : { ...poll, choices: [...poll.choices, ""] };

/** The poll without the choice at `index`, keeping two at least. */
export const removeChoice = (poll: PollDraft, index: number): PollDraft =>
  poll.choices.length <= fewestChoices
    ? poll
    : {
        ...poll,
        choices: poll.choices.filter((_choice, place) => place !== index),
      };

/** The poll with the choice at `index` saying `text`. */
export const changeChoice = (
  poll: PollDraft,
  index: number,
  text: string
): PollDraft => ({
  ...poll,
  choices: poll.choices.map((choice, place) =>
    place === index ? text : choice
  ),
});

// Five, fifteen and thirty minutes, one, six and twelve hours, one, three
// and seven days.
const offeredDurations = [5, 15, 30, 60, 360, 720, 1440, 4320, 10_080];

/**
 * The times a poll may be given, in minutes, shortest first, with the one
 * it has when the API gave it another.
 */
export const durationChoices = (current: number): readonly number[] =>
  offeredDurations.includes(current)
    ? offeredDurations
    : [...offeredDurations, current].toSorted((left, right) => left - right);

/** What a platform would refuse in the poll, as the server checks it. */
export type PollProblem =
  // Peal sends no poll there.
  | { readonly _tag: "notSupported" }
  | {
      readonly _tag: "choiceCount";
      readonly maximum: number;
      readonly minimum: number;
    }
  // A choice, by its place from 1, empty or too long.
  | {
      readonly _tag: "choiceLength";
      readonly choice: number;
      readonly length: number;
      readonly maximum: number;
    }
  | {
      readonly _tag: "duration";
      readonly maximum: number;
      readonly minimum: number;
    }
  | { readonly _tag: "multipleChoice" }
  | { readonly _tag: "withMedia" };

/**
 * What `platform` would refuse in the poll, with `media` files beside it
 * and the channel's `options`, in the order the server names them.
 */
export const pollProblemsOn = (
  platform: Platform,
  poll: PollDraft,
  media: number,
  options?: TargetOptions
): readonly PollProblem[] => {
  const rules = rulesFor(platform, options).poll;

  if (rules === undefined) {
    return [{ _tag: "notSupported" }];
  }

  const count = poll.choices.length;
  const { choiceLimit, duration } = rules;

  const lengths = poll.choices.flatMap(
    (choice, index): readonly PollProblem[] => {
      const length = measureText(choice.trim(), choiceLimit.unit);

      return length === 0 || length > choiceLimit.maximum
        ? [
            {
              _tag: "choiceLength",
              choice: index + 1,
              length,
              maximum: choiceLimit.maximum,
            },
          ]
        : [];
    }
  );

  const outOfRange =
    duration._tag === "range" &&
    (poll.durationMinutes < duration.minimumMinutes ||
      poll.durationMinutes > duration.maximumMinutes);

  return [
    ...(count < rules.minChoices || count > rules.maxChoices
      ? [
          {
            _tag: "choiceCount" as const,
            maximum: rules.maxChoices,
            minimum: rules.minChoices,
          },
        ]
      : []),
    ...lengths,
    ...(outOfRange
      ? [
          {
            _tag: "duration" as const,
            maximum: duration.maximumMinutes,
            minimum: duration.minimumMinutes,
          },
        ]
      : []),
    ...(poll.multipleChoice && !rules.multipleChoice
      ? [{ _tag: "multipleChoice" as const }]
      : []),
    ...(media > 0 ? [{ _tag: "withMedia" as const }] : []),
  ];
};

/**
 * Whether every channel takes the poll, with the files it shows there and
 * its options; a post without one fits.
 */
export const pollFitsOn = (
  channels: readonly { readonly id: string; readonly platform: Platform }[],
  poll: PollDraft | undefined,
  mediaOn: (channelId: string) => number,
  optionsOn: (channelId: string) => TargetOptions | undefined
): boolean =>
  poll === undefined ||
  channels.every(
    ({ id, platform }) =>
      pollProblemsOn(platform, poll, mediaOn(id), optionsOn(id)).length === 0
  );
