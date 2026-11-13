import { describe, expect, it } from "@effect/vitest";

import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { partsOn, PostContent } from "#publishing/domain/post-content.ts";
import {
  mediaWithoutTextOf,
  RecyclingVariant,
  sayingVariant,
} from "#publishing/domain/recycling-variant.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";

const square = ChannelIdSchema.make("00000000-0000-7000-8000-000000000001");

const other = ChannelIdSchema.make("00000000-0000-7000-8000-000000000002");

const attached = (suffix: string) =>
  new MediaAttachment({
    altText: "",
    mediaId: MediaAssetIdSchema.make(
      `00000000-0000-7000-8000-00000000a00${suffix}`
    ),
  });

// The source shows a video, and a square image on one channel instead.
const source = new PostContent({
  media: [attached("1")],
  overrides: [
    new TextOverride({
      channelId: square,
      media: [attached("2")],
      text: "Here",
    }),
  ],
  text: "The source",
});

const mediaOn = (content: PostContent, channelId: typeof square) =>
  partsOn(content, channelId)[0]?.media.map(({ mediaId }) => mediaId);

describe(sayingVariant, () => {
  it("keeps each channel's own media under a variant's text", () => {
    const said = sayingVariant(
      source,
      [square, other],
      new RecyclingVariant({ overrides: [], text: "A variant" })
    );

    expect(mediaOn(said, square)).toStrictEqual([attached("2").mediaId]);
    expect(mediaOn(said, other)).toStrictEqual([attached("1").mediaId]);
    expect(partsOn(said, square)[0]?.text).toBe("A variant");
  });

  it("keeps them under the variant's own text on that channel", () => {
    const said = sayingVariant(
      source,
      [square, other],
      new RecyclingVariant({
        overrides: [
          new TextOverride({ channelId: square, text: "Varied here" }),
        ],
        text: "A variant",
      })
    );

    expect(mediaOn(said, square)).toStrictEqual([attached("2").mediaId]);
    expect(partsOn(said, square)[0]?.text).toBe("Varied here");
  });
});

describe(mediaWithoutTextOf, () => {
  it("names a channel whose own media an empty variant gives no text", () => {
    const empty = new RecyclingVariant({ overrides: [], text: "" });

    expect(mediaWithoutTextOf(source, [square, other], empty)).toStrictEqual([
      square,
    ]);
    expect(() => sayingVariant(source, [square, other], empty)).not.toThrow();
    expect(
      mediaWithoutTextOf(
        source,
        [square, other],
        new RecyclingVariant({
          overrides: [new TextOverride({ channelId: square, text: "Here" })],
          text: "",
        })
      )
    ).toStrictEqual([]);
  });
});
