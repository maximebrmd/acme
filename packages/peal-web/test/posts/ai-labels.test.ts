import { describe, expect, it } from "@effect/vitest";

import {
  aiLabelOf,
  aiLabelsNotice,
  labelledFor,
  labelledIn,
  presetAiLabels,
} from "#posts/ai-labels.ts";
import { channelOptionsOf, initialValues } from "#posts/target-options.ts";

const youtube = { id: "c-youtube", platform: "youtube" } as const;
const tiktok = { id: "c-tiktok", platform: "tiktok" } as const;
const x = { id: "c-x", platform: "x" } as const;
const bluesky = { id: "c-bluesky", platform: "bluesky" } as const;

describe(presetAiLabels, () => {
  it("turns each platform's AI label on, once media made by AI is attached", () => {
    const preset = presetAiLabels({
      channels: [youtube, tiktok, x, bluesky],
      labelled: new Set(),
      madeByAi: true,
      values: {},
      writable: true,
    });

    expect(preset.changed).toBeTruthy();
    expect(preset.values[youtube.id]?.["containsSyntheticMedia"]).toBeTruthy();
    expect(preset.values[tiktok.id]?.["aiGenerated"]).toBeTruthy();
    expect(preset.values[x.id]?.["madeWithAi"]).toBeTruthy();
    expect(preset.values[bluesky.id]).toBeUndefined();
  });

  it("presets nothing without media made by AI", () => {
    const preset = presetAiLabels({
      channels: [youtube],
      labelled: new Set(),
      madeByAi: false,
      values: {},
      writable: true,
    });

    expect(preset.changed).toBeFalsy();
    expect(preset.values).toStrictEqual({});
  });

  it("presets each channel once, and never over the member's choice", () => {
    const first = presetAiLabels({
      channels: [youtube],
      labelled: new Set(),
      madeByAi: true,
      values: {},
      writable: true,
    });

    // The member turns the label off again: nothing turns it back on.
    const turnedOff = {
      [youtube.id]: {
        ...first.values[youtube.id],
        containsSyntheticMedia: false,
      },
    };

    const again = presetAiLabels({
      channels: [youtube, x],
      labelled: first.labelled,
      madeByAi: true,
      values: turnedOff,
      writable: true,
    });

    expect(again.values[youtube.id]?.["containsSyntheticMedia"]).toBeFalsy();
    expect(again.values[x.id]?.["madeWithAi"]).toBeTruthy();

    const settled = presetAiLabels({
      channels: [youtube, x],
      labelled: again.labelled,
      madeByAi: true,
      values: again.values,
      writable: true,
    });

    expect(settled.changed).toBeFalsy();
  });

  it("never presets a label the member changed before", () => {
    const before = { [tiktok.id]: initialValues("tiktok") };
    const on = { ...initialValues("tiktok"), aiGenerated: true };

    // Turned on, then off again, before any media made by AI.
    const once = labelledFor(tiktok, before, on, new Set());

    const twice = labelledFor(
      tiktok,
      { [tiktok.id]: on },
      { ...on, aiGenerated: false },
      once
    );

    const preset = presetAiLabels({
      channels: [tiktok],
      labelled: twice,
      madeByAi: true,
      values: { [tiktok.id]: { ...on, aiGenerated: false } },
      writable: true,
    });

    expect(twice.has(tiktok.id)).toBeTruthy();
    expect(preset.changed).toBeFalsy();
    expect(preset.values[tiktok.id]?.["aiGenerated"]).toBeFalsy();
  });

  it("leaves the label alone when another option changes", () => {
    const values = { [tiktok.id]: initialValues("tiktok") };

    expect(
      labelledFor(
        tiktok,
        values,
        { ...initialValues("tiktok"), disableComment: true },
        new Set()
      ).size
    ).toBe(0);
  });
});

describe(aiLabelOf, () => {
  it("names the label of the three platforms that have one", () => {
    expect([
      aiLabelOf("youtube"),
      aiLabelOf("tiktok"),
      aiLabelOf("x"),
      aiLabelOf("linkedin"),
    ]).toStrictEqual([
      "containsSyntheticMedia",
      "aiGenerated",
      "madeWithAi",
      undefined,
    ]);
  });
});

describe(labelledIn, () => {
  it("settles the labels a saved post's options already hold", () => {
    expect([
      ...labelledIn({
        targets: [
          { channelId: youtube.id, options: { containsSyntheticMedia: false } },
          { channelId: x.id, options: null },
          { channelId: tiktok.id, options: { disableComment: true } },
        ],
      }),
    ]).toStrictEqual([youtube.id]);
    expect(labelledIn(undefined).size).toBe(0);
  });
});

describe("a label the member settled", () => {
  it("is sent and kept, so a reopened draft presets nothing", () => {
    const preset = presetAiLabels({
      channels: [x],
      labelled: new Set(),
      madeByAi: true,
      values: {},
      writable: true,
    });

    // The member turns it off: every other option is at its default.
    const values = {
      [x.id]: { ...preset.values[x.id], madeWithAi: false },
    };

    const { options } = channelOptionsOf(
      [x],
      values,
      ["image"],
      preset.labelled
    );

    expect(options.map(({ channelId }) => channelId)).toStrictEqual([x.id]);

    const reopened = labelledIn({
      targets: options.map(({ channelId, options: stored }) => ({
        channelId,
        options: stored,
      })),
    });

    expect(
      presetAiLabels({
        channels: [x],
        labelled: reopened,
        madeByAi: true,
        values,
        writable: true,
      }).changed
    ).toBeFalsy();
  });

  it("is never preset on a post that cannot be written", () => {
    expect(
      presetAiLabels({
        channels: [x, youtube],
        labelled: new Set(),
        madeByAi: true,
        values: {},
        writable: false,
      }).changed
    ).toBeFalsy();
  });
});

describe(aiLabelsNotice, () => {
  const on = { [x.id]: { ...initialValues("x"), madeWithAi: true } };

  it("names where the label is on and where it is off", () => {
    expect(
      aiLabelsNotice({
        channels: [x, youtube, bluesky],
        madeByAi: true,
        presetBy: new Set([x.id]),
        values: on,
      })
    ).toStrictEqual({ _tag: "madeByAi", off: ["youtube"], on: ["x"] });
  });

  it("says a label Peal turned on stays on once the media is gone", () => {
    expect(
      aiLabelsNotice({
        channels: [x, youtube],
        madeByAi: false,
        presetBy: new Set([x.id]),
        values: on,
      })
    ).toStrictEqual({ _tag: "leftOn", platforms: ["x"] });
    expect(
      aiLabelsNotice({
        channels: [x],
        madeByAi: false,
        presetBy: new Set(),
        values: on,
      })
    ).toStrictEqual({ _tag: "none" });
  });
});
