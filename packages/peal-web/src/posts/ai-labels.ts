import type { Platform, Post } from "peal-contract";

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
  post: Pick<Post, "targets"> | undefined
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
  /** The channels whose label is settled: preset, or chosen by the member. */
  readonly labelled: ReadonlySet<string>;
  readonly values: ValuesByChannel;
}

/**
 * Turns the AI label on, on each channel whose platform has one, once the
 * post shows media made by AI: once a channel, and never where the member
 * chose (`labelled`). The member may turn it off again.
 */
export const presetAiLabels = ({
  channels,
  labelled,
  madeByAi,
  values,
}: {
  readonly channels: readonly LabelledChannel[];
  readonly labelled: ReadonlySet<string>;
  readonly madeByAi: boolean;
  readonly values: ValuesByChannel;
}): AiLabelsPreset => {
  const due = madeByAi
    ? channels.filter(
        ({ id, platform }) =>
          aiLabelOf(platform) !== undefined && !labelled.has(id)
      )
    : [];

  if (due.length === 0) {
    return { changed: false, labelled, values };
  }

  return {
    changed: true,
    labelled: new Set([...labelled, ...due.map(({ id }) => id)]),
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
