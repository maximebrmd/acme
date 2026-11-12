"use client";

import { Option } from "effect";
import type { Platform, Post } from "peal-contract";
import { useState } from "react";

import {
  aiLabelOf,
  labelledFor,
  labelledIn,
  presetAiLabels,
} from "#posts/ai-labels.ts";
import type { AttachedMedia } from "#posts/media-fit.ts";
import type { OptionValues, ValuesByChannel } from "#posts/target-options.ts";

interface AiLabelsInput {
  readonly attached: readonly AttachedMedia[];
  readonly optionValues: ValuesByChannel;
  readonly post: Post | undefined;
  readonly selected: readonly {
    readonly id: string;
    readonly platform: Platform;
  }[];
  readonly setOptionValues: (values: ValuesByChannel) => void;
}

/** Whether the post shows media made by AI, and what the composer did. */
export interface AiLabels {
  /** Tells that the member changed a channel's options to `values`. */
  readonly changed: (channelId: string, values: OptionValues) => void;
  readonly madeByAi: boolean;
  /** The platforms of the post whose AI label Peal turned on. */
  readonly platforms: readonly Platform[];
}

/**
 * The composer's AI labels: once the post shows media made by AI, each
 * selected channel whose platform has a label gets it on, once, unless the
 * member chose it (`presetAiLabels`). The preset is applied while
 * rendering, as the attachments arrive, which converges: a channel is
 * preset at most once.
 */
export const useAiLabels = ({
  attached,
  optionValues,
  post,
  selected,
  setOptionValues,
}: AiLabelsInput): AiLabels => {
  const [labelled, setLabelled] = useState<ReadonlySet<string>>(() =>
    labelledIn(post)
  );

  const madeByAi = attached.some(({ media }) =>
    Option.exists(media, ({ aiGenerated }) => aiGenerated)
  );

  const preset = presetAiLabels({
    channels: selected,
    labelled,
    madeByAi,
    values: optionValues,
  });

  if (preset.changed) {
    setOptionValues(preset.values);
    setLabelled(preset.labelled);
  }

  return {
    changed: (channelId, values) => {
      const channel = selected.find(({ id }) => id === channelId);

      if (channel !== undefined) {
        setLabelled((current) =>
          labelledFor(channel, optionValues, values, current)
        );
      }
    },
    madeByAi,
    platforms: madeByAi
      ? [
          ...new Set(
            selected.flatMap(({ platform }) =>
              aiLabelOf(platform) === undefined ? [] : [platform]
            )
          ),
        ]
      : [],
  };
};
