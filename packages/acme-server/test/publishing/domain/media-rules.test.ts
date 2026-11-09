import { describe, expect, it } from "@effect/vitest";
import { Duration, Option } from "effect";

import { mediaViolationsOn } from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import type { MediaFile } from "#publishing/domain/media-file.ts";
import { platformRules } from "#publishing/domain/platform-rules.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { mediaFile } from "#test/publishing/support.ts";

const mebibyte = 1024 * 1024;

const on = (platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-000000000001"),
  platform,
});

const first = MediaAssetIdSchema.make("00000000-0000-7000-8000-00000000a001");

const second = MediaAssetIdSchema.make("00000000-0000-7000-8000-00000000a002");

const third = MediaAssetIdSchema.make("00000000-0000-7000-8000-00000000a003");

// A post showing these files, each with this alt text.
const showing = (files: readonly MediaFile[], altText = "A synthetic image") =>
  new PostContent({
    media: files.map(
      ({ mediaId }) => new MediaAttachment({ altText, mediaId })
    ),
    overrides: [],
    text: "A synthetic post",
  });

const violations = (platform: Platform, ...files: MediaFile[]) =>
  mediaViolationsOn(showing(files), on(platform), files);

const video = (
  mediaId: MediaAssetId,
  options: Partial<
    Pick<MediaFile, "byteSize" | "contentType" | "dimensions" | "duration">
  > = {}
) =>
  mediaFile(mediaId, {
    byteSize: 20 * mebibyte,
    contentType: "video/mp4",
    dimensions: Option.some({ height: 1920, width: 1080 }),
    duration: Option.some(Duration.seconds(30)),
    ...options,
  });

const sized = (width: number, height: number) => Option.some({ height, width });

// An animated GIF.
const animated = (mediaId: MediaAssetId) =>
  mediaFile(mediaId, { contentType: "image/gif" });

// A video lasting `ms` milliseconds, a fraction possibly.
const lasting = (ms: number) =>
  video(first, { duration: Option.some(Duration.millis(ms)) });

describe(mediaViolationsOn, () => {
  it("takes a common photo and video on every platform with media rules", () => {
    const withRules = PlatformSchema.literals.filter(
      (platform) => platformRules[platform].media !== undefined
    );

    expect(withRules.toSorted()).toStrictEqual([
      "bluesky",
      "facebook",
      "instagram",
      "linkedin",
      "mastodon",
      "threads",
      "x",
      "youtube",
    ]);

    for (const platform of withRules) {
      expect(violations(platform, video(first))).toStrictEqual([]);
    }

    // YouTube takes videos only.
    for (const platform of withRules.filter((name) => name !== "youtube")) {
      expect(violations(platform, mediaFile(first))).toStrictEqual([]);
    }
  });

  it("takes one video alone on YouTube, of 12 hours at most", () => {
    const long = video(first, {
      byteSize: 900 * mebibyte,
      contentType: "video/quicktime",
      duration: Option.some(Duration.hours(12)),
    });

    expect(violations("youtube", long)).toStrictEqual([]);
    expect(
      violations(
        "youtube",
        video(first, { duration: Option.some(Duration.millis(43_200_001)) })
      )
    ).toStrictEqual([
      {
        _tag: "videoTooLong",
        ...on("youtube"),
        durationMs: 43_200_001,
        maximumMs: 43_200_000,
        mediaId: first,
      },
    ]);
    expect(violations("youtube", mediaFile(second))).toStrictEqual([
      {
        _tag: "mediaTypeUnsupported",
        ...on("youtube"),
        contentType: "image/jpeg",
        mediaId: second,
      },
    ]);
    expect(violations("youtube", video(first), video(second))).toStrictEqual([
      {
        _tag: "tooManyVideos",
        ...on("youtube"),
        count: 2,
        maximum: 1,
      },
    ]);
  });

  it("refuses file types the platform does not take", () => {
    const gif = mediaFile(first, { contentType: "image/gif" });
    const webp = mediaFile(second, { contentType: "image/webp" });
    const quicktime = video(first, { contentType: "video/quicktime" });

    expect(violations("instagram", gif)).toStrictEqual([
      {
        _tag: "mediaTypeUnsupported",
        ...on("instagram"),
        contentType: "image/gif",
        mediaId: first,
      },
    ]);
    expect(violations("linkedin", webp)).toStrictEqual([
      {
        _tag: "mediaTypeUnsupported",
        ...on("linkedin"),
        contentType: "image/webp",
        mediaId: second,
      },
    ]);
    expect(violations("bluesky", quicktime)).toStrictEqual([
      {
        _tag: "mediaTypeUnsupported",
        ...on("bluesky"),
        contentType: "video/quicktime",
        mediaId: first,
      },
    ]);
    expect(violations("mastodon", gif, webp)).toStrictEqual([]);
  });

  it("takes photos of up to 10 MiB and a video alone on Facebook Pages", () => {
    const webp = mediaFile(first, { contentType: "image/webp" });
    const large = mediaFile(second, { byteSize: 11 * mebibyte });

    expect(violations("facebook", webp, large)).toStrictEqual([
      {
        _tag: "mediaTypeUnsupported",
        ...on("facebook"),
        contentType: "image/webp",
        mediaId: first,
      },
      {
        _tag: "mediaTooLarge",
        ...on("facebook"),
        byteSize: 11 * mebibyte,
        maximum: 10 * mebibyte,
        mediaId: second,
      },
    ]);
    expect(
      violations("facebook", video(first), mediaFile(second))
    ).toStrictEqual([{ _tag: "mixedMedia", ...on("facebook") }]);
    expect(
      violations(
        "facebook",
        video(first, { contentType: "video/quicktime" }),
        video(second)
      )
    ).toStrictEqual([
      { _tag: "tooManyVideos", ...on("facebook"), count: 2, maximum: 1 },
    ]);
  });

  it("weighs each file against its own type's limit", () => {
    const photo = mediaFile(first, { byteSize: 6 * mebibyte });

    const gif = mediaFile(first, {
      byteSize: 6 * mebibyte,
      contentType: "image/gif",
    });

    expect(violations("x", photo)).toStrictEqual([
      {
        _tag: "mediaTooLarge",
        ...on("x"),
        byteSize: 6 * mebibyte,
        maximum: 5 * mebibyte,
        mediaId: first,
      },
    ]);
    expect(violations("x", gif)).toStrictEqual([]);

    expect(
      violations("bluesky", mediaFile(first, { byteSize: 2_000_000 }))
    ).toStrictEqual([]);
    expect(
      violations("bluesky", mediaFile(first, { byteSize: 2_000_001 }))
    ).toStrictEqual([
      {
        _tag: "mediaTooLarge",
        ...on("bluesky"),
        byteSize: 2_000_001,
        maximum: 2_000_000,
        mediaId: first,
      },
    ]);
  });

  it("keeps videos within the platform's durations", () => {
    const at = (duration: Duration.Duration) =>
      video(first, { duration: Option.some(duration) });

    expect(violations("x", at(Duration.seconds(140)))).toStrictEqual([]);
    expect(violations("x", at(Duration.millis(140_000.6)))).toStrictEqual([
      {
        _tag: "videoTooLong",
        ...on("x"),
        durationMs: 140_001,
        maximumMs: 140_000,
        mediaId: first,
      },
    ]);
    expect(violations("x", at(Duration.millis(400.4)))).toStrictEqual([
      {
        _tag: "videoTooShort",
        ...on("x"),
        durationMs: 400,
        mediaId: first,
        minimumMs: 500,
      },
    ]);
    expect(violations("linkedin", at(Duration.minutes(30)))).toStrictEqual([]);
    expect(violations("bluesky", at(Duration.minutes(4)))).toStrictEqual([
      {
        _tag: "videoTooLong",
        ...on("bluesky"),
        durationMs: 240_000,
        maximumMs: 180_000,
        mediaId: first,
      },
    ]);
  });

  it("measures durations in whole milliseconds, as the media API shows them", () => {
    // The API shows 140,000 ms and 500 ms: a client checking those finds
    // nothing, and neither does the server.
    expect(violations("x", lasting(140_000.4))).toStrictEqual([]);
    expect(violations("x", lasting(499.6))).toStrictEqual([]);
  });

  it("checks pixels and the aspect ratio", () => {
    expect(
      violations("mastodon", video(first, { dimensions: sized(3840, 2160) }))
    ).toStrictEqual([]);
    expect(
      violations("mastodon", video(first, { dimensions: sized(7680, 4320) }))
    ).toStrictEqual([
      {
        _tag: "tooManyPixels",
        ...on("mastodon"),
        height: 4320,
        maximum: 8_294_400,
        mediaId: first,
        width: 7680,
      },
    ]);

    // Instagram takes photos from 4:5 to 1.91:1, both included.
    const photo = (width: number, height: number) =>
      mediaFile(first, { dimensions: sized(width, height) });

    expect(violations("instagram", photo(1080, 1350))).toStrictEqual([]);
    expect(violations("instagram", photo(1910, 1000))).toStrictEqual([]);
    expect(violations("instagram", photo(3000, 1000))).toStrictEqual([
      {
        _tag: "aspectRatioUnsupported",
        ...on("instagram"),
        height: 1000,
        maximum: 1.91,
        mediaId: first,
        minimum: 0.8,
        width: 3000,
      },
    ]);
  });

  it("leaves what the probe did not find to the platform", () => {
    const unprobed = video(first, {
      dimensions: Option.none(),
      duration: Option.none(),
    });

    expect(violations("x", unprobed)).toStrictEqual([]);
    expect(violations("instagram", unprobed)).toStrictEqual([]);
  });

  it("counts videos, and keeps them apart from images where it must", () => {
    expect(violations("x", video(first), video(second))).toStrictEqual([
      { _tag: "tooManyVideos", ...on("x"), count: 2, maximum: 1 },
    ]);
    expect(
      violations("mastodon", mediaFile(first), video(second))
    ).toStrictEqual([{ _tag: "mixedMedia", ...on("mastodon") }]);
    expect(
      violations("threads", video(first), video(second), mediaFile(third))
    ).toStrictEqual([]);
  });

  it("shows a GIF alone on X, as it shows a video", () => {
    expect(violations("x", animated(first))).toStrictEqual([]);
    expect(violations("x", animated(first), mediaFile(second))).toStrictEqual([
      { _tag: "tooManyMedia", ...on("x"), count: 2, maximum: 1 },
    ]);
    expect(violations("x", animated(first), animated(second))).toStrictEqual([
      { _tag: "tooManyMedia", ...on("x"), count: 2, maximum: 1 },
    ]);
    // Elsewhere, a GIF is an image like the others.
    expect(
      violations("bluesky", animated(first), mediaFile(second))
    ).toStrictEqual([]);
  });

  it("leaves a post over the platform's own count to that count", () => {
    const images = ["a002", "a003", "a004", "a005"].map((suffix) =>
      mediaFile(
        MediaAssetIdSchema.make(`00000000-0000-7000-8000-00000000${suffix}`)
      )
    );

    // Five files are over X's four already: violationsOn says so.
    expect(
      violations("x", animated(first), ...images).filter(
        ({ _tag }) => _tag === "tooManyMedia"
      )
    ).toStrictEqual([]);
  });

  it("measures alt text in code points against the platform's limit", () => {
    const photo = [mediaFile(first)];

    expect(
      mediaViolationsOn(showing(photo, "é".repeat(1000)), on("x"), photo)
    ).toStrictEqual([]);
    expect(
      mediaViolationsOn(showing(photo, "😀".repeat(1001)), on("x"), photo)
    ).toStrictEqual([
      {
        _tag: "altTextTooLong",
        ...on("x"),
        length: 1001,
        maximum: 1000,
        mediaId: first,
      },
    ]);
    expect(
      mediaViolationsOn(
        showing(photo, "😀".repeat(1001)),
        on("mastodon"),
        photo
      )
    ).toStrictEqual([]);
  });

  it("refuses nothing where no media rule is known", () => {
    const huge = mediaFile(first, {
      byteSize: 900 * mebibyte,
      contentType: "video/quicktime",
      duration: Option.some(Duration.hours(2)),
    });

    for (const platform of ["pinterest", "tiktok"] as const) {
      expect(violations(platform, huge, mediaFile(second))).toStrictEqual([]);
    }
  });
});
