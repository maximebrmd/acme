import type { Platform } from "peal-contract";

import { initialValues } from "#posts/target-options.ts";
import type { OptionValues, ValuesByChannel } from "#posts/target-options.ts";

// The option each platform has that says a post shows media made by AI,
// where Peal has one.
const aiLabels: Partial<Record<Platform, string>> = {
  tiktok: "aiGenerated",
  x: "madeWithAi",
  youtube: "containsSyntheticMedia",
};

/** The name of the platform's AI label option, if Peal has one. */
export const aiLabelOf = (platform: Platform): string | undefined =>
  aiLabels[platform];

/**
 * The channels of a saved post whose options already say whether it shows
 * media made by AI: their label is settled, as the member left it.
 */
export const labelledIn = (
  post:
    | {
        readonly targets: readonly {
          readonly channelId: string;
          readonly options: object | null;
        }[];
      }
    | undefined
): ReadonlySet<string> =>
  new Set(
    (post?.targets ?? []).flatMap(({ channelId, options }) =>
      options !== null &&
      Object.values(aiLabels).some((label) => label in options)
        ? [channelId]
        : []
    )
  );

/** A channel of the post, as the composer selects it. */
interface LabelledChannel {
  readonly id: string;
  readonly platform: Platform;
}

/**
 * The channels whose AI label is settled, once the member changed a
 * channel's options from `before` to `after`: a change of the label itself
 * is the member's choice, which no preset overrides.
 */
export const labelledFor = (
  channel: LabelledChannel,
  before: ValuesByChannel,
  after: OptionValues,
  labelled: ReadonlySet<string>
): ReadonlySet<string> => {
  const label = aiLabelOf(channel.platform);

  if (label === undefined || labelled.has(channel.id)) {
    return labelled;
  }

  const was = (before[channel.id] ?? initialValues(channel.platform))[label];

  return was === after[label] ? labelled : new Set([...labelled, channel.id]);
};

/** The post's options once the AI labels are preset, and where. */
export interface AiLabelsPreset {
  /** Whether anything was preset now. */
  readonly changed: boolean;
  /** The channels whose label was preset now. */
  readonly presetNow: readonly string[];
  /** The channels whose label is settled: preset, or chosen by the member. */
  readonly labelled: ReadonlySet<string>;
  readonly values: ValuesByChannel;
}

/**
 * Turns the AI label on, on each channel whose platform has one, once the
 * post shows media made by AI: once a channel, never where the member
 * chose (`labelled`), and only while the post can be written: a locked
 * post shows what it holds. The member may turn it off again.
 */
export const presetAiLabels = ({
  channels,
  labelled,
  madeByAi,
  values,
  writable,
}: {
  readonly channels: readonly LabelledChannel[];
  readonly labelled: ReadonlySet<string>;
  readonly madeByAi: boolean;
  readonly values: ValuesByChannel;
  readonly writable: boolean;
}): AiLabelsPreset => {
  const due =
    madeByAi && writable
      ? channels.filter(
          ({ id, platform }) =>
            aiLabelOf(platform) !== undefined && !labelled.has(id)
        )
      : [];

  if (due.length === 0) {
    return { changed: false, labelled, presetNow: [], values };
  }

  return {
    changed: true,
    labelled: new Set([...labelled, ...due.map(({ id }) => id)]),
    presetNow: due.map(({ id }) => id),
    values: {
      ...values,
      ...Object.fromEntries(
        due.map(({ id, platform }) => [
          id,
          {
            ...(values[id] ?? initialValues(platform)),
            [aiLabelOf(platform) ?? ""]: true,
          },
        ])
      ),
    },
  };
};

/** What the composer says about the AI labels of the post. */
export type AiLabelsNotice =
  | { readonly _tag: "none" }
  // The post shows media made by AI: where its label is on, and where a
  // platform that has one shows none.
  | {
      readonly _tag: "madeByAi";
      readonly off: readonly Platform[];
      readonly on: readonly Platform[];
    }
  // No media made by AI is left, but a label Peal turned on still is.
  | { readonly _tag: "leftOn"; readonly platforms: readonly Platform[] };

// Each platform once, in the order the channels come.
const platformsOf = (channels: readonly LabelledChannel[]) => [
  ...new Set(channels.map(({ platform }) => platform)),
];

/**
 * What to tell the member about the AI labels, from what the options hold
 * now: `presetBy` are the channels whose label Peal turned on.
 */
export const aiLabelsNotice = ({
  channels,
  madeByAi,
  presetBy,
  values,
}: {
  readonly channels: readonly LabelledChannel[];
  readonly madeByAi: boolean;
  readonly presetBy: ReadonlySet<string>;
  readonly values: ValuesByChannel;
}): AiLabelsNotice => {
  const isOn = ({ id, platform }: LabelledChannel) => {
    const label = aiLabelOf(platform);

    return (
      label !== undefined &&
      (values[id] ?? initialValues(platform))[label] === true
    );
  };

  const labelled = channels.filter(
    ({ platform }) => aiLabelOf(platform) !== undefined
  );

  if (madeByAi) {
    return {
      _tag: "madeByAi",
      off: platformsOf(labelled.filter((channel) => !isOn(channel))),
      on: platformsOf(labelled.filter(isOn)),
    };
  }

  const leftOn = platformsOf(
    labelled.filter((channel) => presetBy.has(channel.id) && isOn(channel))
  );

  return leftOn.length === 0
    ? { _tag: "none" }
    : { _tag: "leftOn", platforms: leftOn };
};
