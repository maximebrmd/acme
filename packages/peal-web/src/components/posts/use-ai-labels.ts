"use client";

import { Option } from "effect";
import type { Platform } from "peal-contract";
import { useState } from "react";

import {
  aiLabelsNotice,
  labelledFor,
  labelledIn,
  presetAiLabels,
} from "#posts/ai-labels.ts";
import type { AiLabelsNotice } from "#posts/ai-labels.ts";
import type { AttachedMedia } from "#posts/media-fit.ts";
import type { OptionValues, ValuesByChannel } from "#posts/target-options.ts";

interface AiLabelsInput {
  /** Every attachment of the post, its follow-up parts' included. */
  readonly attached: readonly AttachedMedia[];
  readonly optionValues: ValuesByChannel;
  readonly post:
    | {
        readonly targets: readonly {
          readonly channelId: string;
          readonly options: object | null;
        }[];
      }
    | undefined;
  readonly selected: readonly {
    readonly id: string;
    readonly platform: Platform;
  }[];
  readonly setOptionValues: (values: ValuesByChannel) => void;
  /** Whether the member may change the post now: a draft they may write. */
  readonly writable: boolean;
}

/** What the composer did with the AI labels, and what to say of them. */
export interface AiLabels {
  /** Tells that the member changed a channel's options to `values`. */
  readonly changed: (channelId: string, values: OptionValues) => void;
  /** The channels whose label is settled: their options are always sent. */
  readonly labelled: ReadonlySet<string>;
  readonly notice: AiLabelsNotice;
  readonly writable: boolean;
}

/**
 * The composer's AI labels: once the post shows media made by AI, each
 * selected channel whose platform has a label gets it on, once, unless the
 * member chose it (`presetAiLabels`), and only while the post can be
 * written. The preset is applied while rendering, as the attachments
 * arrive, which converges: a channel is preset at most once.
 */
export const useAiLabels = ({
  attached,
  optionValues,
  post,
  selected,
  setOptionValues,
  writable,
}: AiLabelsInput): AiLabels => {
  const [labelled, setLabelled] = useState<ReadonlySet<string>>(() =>
    labelledIn(post)
  );

  // The channels whose label Peal turned on.
  const [presetBy, setPresetBy] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const madeByAi = attached.some(({ media }) =>
    Option.exists(media, ({ aiGenerated }) => aiGenerated)
  );

  const preset = presetAiLabels({
    channels: selected,
    labelled,
    madeByAi,
    values: optionValues,
    writable,
  });

  if (preset.changed) {
    setOptionValues(preset.values);
    setLabelled(preset.labelled);
    setPresetBy(new Set([...presetBy, ...preset.presetNow]));
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
    labelled: preset.labelled,
    notice: aiLabelsNotice({
      channels: selected,
      madeByAi,
      presetBy,
      values: preset.values,
    }),
    writable,
  };
};
