import { describe, expect, it } from "@effect/vitest";
import { Duration, Option, Result, Schema } from "effect";

import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { previewOn } from "#publishing/domain/channel-preview.ts";
import {
  checkPublishable,
  violationsOn,
} from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import { InstagramOptions } from "#publishing/domain/instagram-options.ts";
import type { MediaFile } from "#publishing/domain/media-file.ts";
import { capabilitiesOf } from "#publishing/domain/platform-capabilities.ts";
import { platformRules, rulesFor } from "#publishing/domain/platform-rules.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { postFormatOf } from "#publishing/domain/post-format.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import {
  describeOptionsOn,
  optionConstraintsOn,
  TargetOptionsSchema,
} from "#publishing/domain/target-options.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { contentOf, mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const instagram = channel("1", "instagram");

const facebook = channel("2", "facebook");

const media = (suffix: string): MediaAssetId =>
  MediaAssetIdSchema.make(`00000000-0000-7000-8000-0000000000${suffix}`);

// A vertical picture, 9:16, as stories are made.
const tallPhoto = mediaFile(media("a1"), {
  dimensions: Option.some({ height: 1920, width: 1080 }),
});

const otherPhoto = mediaFile(media("a2"));

const verticalVideo = (seconds: number, id = media("b1")) =>
  mediaFile(id, {
    byteSize: 5_000_000,
    contentType: "video/mp4",
    dimensions: Option.some({ height: 1920, width: 1080 }),
    duration: Option.some(Duration.seconds(seconds)),
  });

const landscapeVideo = mediaFile(media("b2"), {
  byteSize: 5_000_000,
  contentType: "video/mp4",
  dimensions: Option.some({ height: 1080, width: 1920 }),
  duration: Option.some(Duration.seconds(30)),
});

const story = { instagram: new InstagramOptions({ format: "story" }) };

const decode = Schema.decodeUnknownExit(TargetOptionsSchema);

// What scheduling refuses for the post with these files and options.
const refusals = (
  target: ChannelOnPlatform,
  options: TargetOptions,
  files: readonly MediaFile[],
  content = contentOf("A synthetic story", {
    media: files.map(({ mediaId }) => mediaId),
  })
): readonly ContentViolation[] =>
  Option.match(
    Result.getFailure(
      checkPublishable(content, [target], files, [
        new ChannelOptions({ channelId: target.channelId, options }),
      ])
    ),
    { onNone: () => [], onSome: ({ violations }) => violations }
  );

const tags = (violations: readonly ContentViolation[]) =>
  violations.map((violation) =>
    "field" in violation
      ? `${violation._tag}:${violation.field}`
      : violation._tag
  );

describe("a post's format", () => {
  it.each([
    [{ format: "story", platform: "instagram" }, "Success"],
    [{ format: "feed", platform: "instagram" }, "Success"],
    [{ format: "reel", platform: "instagram" }, "Failure"],
    [{ format: "story", platform: "facebook" }, "Success"],
    [{ format: "reel", platform: "facebook" }, "Success"],
    [{ format: "feed", platform: "facebook" }, "Success"],
    [{ format: "carousel", platform: "facebook" }, "Failure"],
  ] as const)("decodes %j to a %s", (input, outcome) => {
    expect(decode(input)._tag).toBe(outcome);
  });

  it("is chosen, never guessed: a feed post and no format are one", () => {
    expect(postFormatOf(Option.none())).toStrictEqual(Option.none());
    expect(
      postFormatOf(Option.some(new InstagramOptions({ format: "feed" })))
    ).toStrictEqual(Option.none());
    expect(postFormatOf(Option.some(story.instagram))).toStrictEqual(
      Option.some("story")
    );
    expect(
      postFormatOf(Option.some(new FacebookOptions({ format: "reel" })))
    ).toStrictEqual(Option.some("reel"));
  });

  it("is described to clients, a feed post when left out", () => {
    for (const platform of ["instagram", "facebook"] as const) {
      expect(
        describeOptionsOn(platform).find(({ name }) => name === "format")
      ).toStrictEqual({
        ifLeftOut: "feed",
        name: "format",
        required: false,
        type: "choice",
        values:
          platform === "instagram"
            ? ["feed", "story"]
            : ["feed", "story", "reel"],
      });
    }
  });

  it("refuses on an Instagram story what a story does not take", () => {
    expect(
      new InstagramOptions({
        audioName: "Synthetic theme",
        collaborators: ["synthetic.friend"],
        format: "story",
        shareToFeed: true,
        thumbOffsetMs: 0,
        trialReel: "manual",
      }).problems()
    ).toStrictEqual(
      [
        "audioName",
        "collaborators",
        "shareToFeed",
        "thumbOffsetMs",
        "trialReel",
      ].map((field) => ({ _tag: "invalid", field }))
    );
    expect(
      new InstagramOptions({
        collaborators: ["synthetic.friend"],
        format: "feed",
      }).problems()
    ).toStrictEqual([]);
  });

  it("refuses a title on a Facebook story, and takes one on a reel", () => {
    expect(
      new FacebookOptions({
        format: "story",
        videoTitle: "A synthetic title",
      }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "videoTitle" }]);
    expect(
      new FacebookOptions({
        format: "reel",
        videoTitle: "A synthetic title",
      }).problems()
    ).toStrictEqual([]);
  });

  it("tells clients which options a format refuses", () => {
    expect(
      optionConstraintsOn("instagram").filter(
        (constraint) =>
          constraint._tag === "onlyWith" && constraint.other === "format"
      )
    ).toHaveLength(6);
    expect(optionConstraintsOn("facebook")).toStrictEqual([
      {
        _tag: "onlyWith",
        field: "videoTitle",
        other: "format",
        values: ["feed", "reel"],
      },
    ]);
  });
});

describe("the rules in force", () => {
  it("are the platform's own without a format, or on a platform without formats", () => {
    for (const platform of platforms) {
      expect(rulesFor(platform, Option.none())).toBe(platformRules[platform]);
    }

    expect(
      rulesFor(
        "instagram",
        Option.some(new InstagramOptions({ format: "feed" }))
      )
    ).toBe(platformRules.instagram);
    expect(
      rulesFor(
        "youtube",
        Option.some(
          new YouTubeOptions({ madeForKids: false, title: "A synthetic video" })
        )
      )
    ).toBe(platformRules.youtube);
    // Options of another platform choose nothing here.
    expect(rulesFor("facebook", Option.some(story.instagram))).toBe(
      platformRules.facebook
    );
  });

  it("are the format's on a story or a reel: one file, no parts", () => {
    const formats = [
      ["instagram", story.instagram],
      ["facebook", new FacebookOptions({ format: "story" })],
      ["facebook", new FacebookOptions({ format: "reel" })],
    ] as const;

    for (const [platform, options] of formats) {
      const rules = rulesFor(platform, Option.some(options));

      expect(rules.maxMedia).toBe(1);
      expect(rules.mediaRequired).toBeTruthy();
      expect(rules.followUps).toBeUndefined();
      expect(rules.postFormats).toBeUndefined();
      expect(rules.textLimits).toStrictEqual(
        platformRules[platform].textLimits
      );
    }

    expect(
      rulesFor("instagram", Option.some(story.instagram)).sendsText
    ).toBeFalsy();
    expect(
      rulesFor("facebook", Option.some(new FacebookOptions({ format: "reel" })))
        .sendsText
    ).toBeTruthy();
  });

  it("are given for Instagram and Facebook only", () => {
    expect(
      platforms.filter(
        (platform) => platformRules[platform].postFormats !== undefined
      )
    ).toStrictEqual(["instagram", "facebook"]);
    expect(
      Object.keys(platformRules.instagram.postFormats ?? {})
    ).toStrictEqual(["story"]);
    expect(Object.keys(platformRules.facebook.postFormats ?? {})).toStrictEqual(
      ["reel", "story"]
    );
  });
});

describe("checking a story or a reel", () => {
  const facebookStory = new FacebookOptions({ format: "story" });
  const reel = new FacebookOptions({ format: "reel" });

  it("takes one file", () => {
    expect(
      tags(refusals(instagram, story.instagram, [tallPhoto, otherPhoto]))
    ).toStrictEqual(["tooManyMedia"]);
    expect(
      tags(refusals(facebook, facebookStory, [tallPhoto, otherPhoto]))
    ).toStrictEqual(["tooManyMedia"]);
  });

  it("needs a file", () => {
    expect(tags(refusals(instagram, story.instagram, []))).toStrictEqual([
      "mediaRequired",
    ]);
    expect(tags(refusals(facebook, reel, []))).toStrictEqual(["mediaRequired"]);
  });

  it("takes a 9:16 JPEG on an Instagram story, which the feed refuses", () => {
    expect(refusals(instagram, story.instagram, [tallPhoto])).toStrictEqual([]);
    expect(
      tags(
        refusals(instagram, new InstagramOptions({ format: "feed" }), [
          tallPhoto,
        ])
      )
    ).toStrictEqual(["aspectRatioUnsupported"]);
  });

  it("refuses a story video longer than 60 seconds", () => {
    expect(
      refusals(instagram, story.instagram, [verticalVideo(60)])
    ).toStrictEqual([]);
    expect(
      tags(refusals(instagram, story.instagram, [verticalVideo(61)]))
    ).toStrictEqual(["videoTooLong"]);
    expect(
      tags(refusals(facebook, facebookStory, [verticalVideo(61)]))
    ).toStrictEqual(["videoTooLong"]);
  });

  it("takes a vertical reel of up to 90 seconds, and no landscape one", () => {
    expect(refusals(facebook, reel, [verticalVideo(90)])).toStrictEqual([]);
    expect(tags(refusals(facebook, reel, [verticalVideo(91)]))).toStrictEqual([
      "videoTooLong",
    ]);
    expect(tags(refusals(facebook, reel, [landscapeVideo]))).toStrictEqual([
      "aspectRatioUnsupported",
    ]);
    expect(tags(refusals(facebook, reel, [tallPhoto]))).toStrictEqual([
      "mediaTypeUnsupported",
    ]);
    // A landscape video is a feed post's.
    expect(
      refusals(facebook, new FacebookOptions({}), [landscapeVideo])
    ).toStrictEqual([]);
  });

  it("refuses collaborators on an Instagram story, and a title on a Facebook story", () => {
    expect(
      tags(
        refusals(
          instagram,
          new InstagramOptions({
            collaborators: ["synthetic.friend"],
            format: "story",
          }),
          [tallPhoto]
        )
      )
    ).toStrictEqual(["optionInvalid:collaborators"]);
    expect(
      tags(
        refusals(
          facebook,
          new FacebookOptions({ format: "story", videoTitle: "A title" }),
          [verticalVideo(30)]
        )
      )
    ).toStrictEqual(["optionInvalid:videoTitle"]);
    expect(
      tags(
        refusals(
          facebook,
          new FacebookOptions({ format: "story", videoTitle: "A title" }),
          [tallPhoto]
        )
      )
    ).toStrictEqual(["optionInvalid:videoTitle"]);
  });

  it("refuses parts after the first", () => {
    const content = new PostContent({
      followUps: [
        new PostPart({
          delaySeconds: 0,
          media: [],
          overrides: [],
          text: "A second part",
        }),
      ],
      media: contentOf("", { media: [tallPhoto.mediaId] }).media,
      overrides: [],
      text: "A synthetic story",
    });

    expect(
      tags(refusals(instagram, story.instagram, [tallPhoto], content))
    ).toStrictEqual(["tooManyParts"]);
  });

  it("counts no text that a story does not send", () => {
    const long = contentOf("#a ".repeat(2000), { media: [tallPhoto.mediaId] });

    expect(
      violationsOn(long, instagram, Option.some(story.instagram))
    ).toStrictEqual([]);
    expect(tags(violationsOn(long, instagram, Option.none()))).toStrictEqual([
      "textTooLong",
      "tooManyHashtags",
    ]);
  });
});

describe("a story's preview", () => {
  const content = contentOf("A synthetic story", {
    media: [tallPhoto.mediaId],
  });

  it("says its text is not sent, and shows none", () => {
    const preview = previewOn(
      content,
      instagram,
      [],
      Option.some(story.instagram)
    );

    expect(preview.textNotSent).toBeTruthy();
    expect(preview.text).toBe("");
    expect(preview.textCounts).toStrictEqual([]);
    expect(preview.media).toStrictEqual({ count: 1, maximum: 1 });
  });

  it("says nothing of text when the post has none, or is a feed post", () => {
    expect(
      previewOn(
        contentOf("", { media: [tallPhoto.mediaId] }),
        instagram,
        [],
        Option.some(story.instagram)
      ).textNotSent
    ).toBeUndefined();
    expect(
      previewOn(content, instagram, [], Option.none()).textNotSent
    ).toBeUndefined();
    expect(
      previewOn(
        content,
        facebook,
        [],
        Option.some(new FacebookOptions({ format: "reel" }))
      ).text
    ).toBe("A synthetic story");
  });
});

describe("a platform's formats, described", () => {
  it("are named, described and given their rules, where there are any", () => {
    const [instagramStory] =
      capabilitiesOf("instagram", false).postFormats ?? [];

    expect(instagramStory?.name).toBe("story");
    expect(instagramStory?.description).not.toBe("");
    expect(instagramStory?.maxMedia).toBe(1);
    expect(instagramStory?.rules).toStrictEqual(
      rulesFor("instagram", Option.some(story.instagram))
    );
    expect(
      (capabilitiesOf("facebook", false).postFormats ?? []).map(
        ({ name }) => name
      )
    ).toStrictEqual(["reel", "story"]);
  });

  it("are left out on the platforms without formats", () => {
    expect(
      platforms.filter(
        (platform) => capabilitiesOf(platform, false).postFormats !== undefined
      )
    ).toStrictEqual(["instagram", "facebook"]);
  });
});
