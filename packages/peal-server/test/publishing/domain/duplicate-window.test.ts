import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { contentOn } from "#publishing/domain/duplicate-window.ts";
import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import { InstagramOptions } from "#publishing/domain/instagram-options.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";

// What a channel receives of a post, as the duplicate guard compares it:
// the whole post there, every part of a thread included.

const channel = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c1");
const other = ChannelIdSchema.make("01900000-0000-7000-8000-0000000000c2");
const picture = MediaAssetIdSchema.make("01900000-0000-7000-8000-0000000000a1");

const part = (text: string, changed: Partial<PostPart> = {}) =>
  new PostPart({ delaySeconds: 0, media: [], overrides: [], text, ...changed });

const post = (text: string, followUps: readonly PostPart[] = []) =>
  new PostContent({ followUps, media: [], overrides: [], text });

describe(contentOn, () => {
  it("keeps a post of one part as it was fingerprinted before posts had parts", () => {
    // Stored digests are of this very text: a post scheduled before must
    // still be found.
    expect(
      contentOn(
        new PostContent({
          media: [
            new MediaAttachment({ altText: "A tide pool", mediaId: picture }),
          ],
          overrides: [],
          text: "  Low tide at six.  ",
        }),
        channel
      )
    ).toBe(`{"media":["${picture}"],"text":"Low tide at six."}`);
  });

  it("covers every part of a thread", () => {
    const opening = "What we found at low tide.";
    const thread = post(opening, [part("The anemones."), part("The crabs.")]);

    // The same opening alone, or with other parts after it, is another
    // post: nobody would see the same thing twice.
    expect(contentOn(thread, channel)).not.toBe(
      contentOn(post(opening), channel)
    );
    expect(contentOn(thread, channel)).not.toBe(
      contentOn(
        post(opening, [part("The anemones."), part("The gulls.")]),
        channel
      )
    );
    expect(contentOn(thread, channel)).not.toBe(
      contentOn(
        post(opening, [part("The crabs."), part("The anemones.")]),
        channel
      )
    );
    expect(contentOn(thread, channel)).not.toBe(
      contentOn(
        post(opening, [
          part("The anemones."),
          part("The crabs.", {
            media: [new MediaAttachment({ altText: "", mediaId: picture })],
          }),
        ]),
        channel
      )
    );
  });

  it("takes the same thread for the same, whatever its waits, its spaces and its alt texts", () => {
    const one = post("What we found.", [
      part("The anemones.", {
        delaySeconds: 60,
        media: [new MediaAttachment({ altText: "Anemones", mediaId: picture })],
      }),
    ]);

    const again = post("What we found. ", [
      part(" The anemones.", {
        delaySeconds: 3600,
        media: [new MediaAttachment({ altText: "", mediaId: picture })],
      }),
    ]);

    expect(contentOn(again, channel)).toBe(contentOn(one, channel));
  });

  it("reads each part's text as the channel has it", () => {
    const thread = post("What we found.", [
      part("The anemones.", {
        overrides: [
          new TextOverride({
            channelId: other,
            text: "The anemones, in short.",
          }),
        ],
      }),
    ]);

    expect(contentOn(thread, other)).not.toBe(contentOn(thread, channel));
    expect(contentOn(thread, other)).toBe(
      contentOn(
        post("What we found.", [part("The anemones, in short.")]),
        other
      )
    );
  });

  it("tells a story or a reel from a feed post of the same file and text", () => {
    const shown = new PostContent({
      media: [new MediaAttachment({ altText: "", mediaId: picture })],
      overrides: [],
      text: "Low tide at six.",
    });

    const story = Option.some(new InstagramOptions({ format: "story" }));
    const feed = contentOn(shown, channel);

    expect(contentOn(shown, channel, story)).not.toBe(feed);
    expect(contentOn(shown, channel, story)).toBe(
      contentOn(
        shown,
        channel,
        Option.some(new InstagramOptions({ format: "story" }))
      )
    );
    expect(
      contentOn(
        shown,
        channel,
        Option.some(new FacebookOptions({ format: "reel" }))
      )
    ).not.toBe(contentOn(shown, channel, story));
  });

  it("takes two stories of the same file for the same, whatever text they hold, as a story sends none", () => {
    const shown = (text: string) =>
      new PostContent({
        media: [new MediaAttachment({ altText: "", mediaId: picture })],
        overrides: [],
        text,
      });

    for (const story of [
      Option.some(new InstagramOptions({ format: "story" })),
      Option.some(new FacebookOptions({ format: "story" })),
    ]) {
      expect(contentOn(shown("Low tide at six."), channel, story)).toBe(
        contentOn(shown("High tide at noon."), channel, story)
      );
    }

    // A reel sends its text: two reels of different text differ.
    const reel = Option.some(new FacebookOptions({ format: "reel" }));

    expect(contentOn(shown("Low tide at six."), channel, reel)).not.toBe(
      contentOn(shown("High tide at noon."), channel, reel)
    );
  });

  it("reads a feed post as it did before formats, the digests kept matching", () => {
    const shown = new PostContent({
      media: [new MediaAttachment({ altText: "", mediaId: picture })],
      overrides: [],
      text: "Low tide at six.",
    });

    const feed = contentOn(shown, channel);

    // However it says so, and whatever its other options.
    expect(
      contentOn(
        shown,
        channel,
        Option.some(new InstagramOptions({ format: "feed" }))
      )
    ).toBe(feed);
    expect(
      contentOn(
        shown,
        channel,
        Option.some(new InstagramOptions({ shareToFeed: true }))
      )
    ).toBe(feed);
    expect(
      contentOn(
        shown,
        channel,
        Option.some(new InstagramOptions({ format: "story" }))
      )
    ).toBe(`{"media":["${picture}"],"text":"","format":"story"}`);
  });
});
