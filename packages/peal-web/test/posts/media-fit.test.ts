import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { PlatformSchema } from "peal-contract";
import type { Media } from "peal-contract";

import { mediaFitOn, mediaFits, showsAltText } from "#posts/media-fit.ts";
import type { AttachedMedia } from "#posts/media-fit.ts";

const created = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const mebibyte = 1024 * 1024;

const kindOf = (contentType: Media["contentType"]): Media["kind"] => {
  if (contentType === "application/pdf") {
    return "document";
  }

  return contentType.startsWith("video/") ? "video" : "image";
};

const file = (
  id: string,
  facts: Partial<
    Pick<Media, "byteSize" | "contentType" | "dimensions" | "durationMs">
  > = {}
): Media => {
  const contentType = facts.contentType ?? "image/jpeg";

  return {
    aiGenerated: false,
    altText: null,
    byteSize: facts.byteSize ?? 200_000,
    codec: null,
    contentType,
    createdAt: created,
    dimensions: facts.dimensions ?? { height: 800, width: 1200 },
    durationMs: facts.durationMs ?? null,
    id,
    kind: kindOf(contentType),
    pageCount: null,
    status: { _tag: "ready" },
    updatedAt: created,
    url: null,
  };
};

const video = (id: string, durationMs = 30_000) =>
  file(id, {
    byteSize: 20 * mebibyte,
    contentType: "video/mp4",
    dimensions: { height: 1920, width: 1080 },
    durationMs,
  });

// A 30-second MP4 of `byteSize` bytes.
const small = (byteSize: number) =>
  file("a", {
    byteSize,
    contentType: "video/mp4",
    dimensions: { height: 1920, width: 1080 },
    durationMs: 30_000,
  });

const loaded = (
  media: Media,
  altText = "A synthetic picture"
): AttachedMedia => ({
  altText,
  media: Option.some(media),
  mediaId: media.id,
});

describe(mediaFitOn, () => {
  it("takes a common photo and video where media rules are known", () => {
    for (const platform of [
      "bluesky",
      "instagram",
      "linkedin",
      "mastodon",
      "threads",
      "x",
    ] as const) {
      expect(mediaFits(mediaFitOn(platform, [loaded(file("a"))]))).toBeTruthy();
      expect(
        mediaFits(mediaFitOn(platform, [loaded(video("a"))]))
      ).toBeTruthy();
    }
  });

  it("names each refused file by its place in the post", () => {
    const fit = mediaFitOn("instagram", [
      loaded(file("a")),
      loaded(file("b", { contentType: "image/gif" })),
      loaded(file("c", { dimensions: { height: 1000, width: 3000 } })),
    ]);

    expect(fit.problems).toStrictEqual([
      {
        _tag: "mediaTypeUnsupported",
        contentType: "image/gif",
        kind: "image",
        position: 2,
      },
      {
        _tag: "aspectRatioUnsupported",
        height: 1000,
        kind: "image",
        maximum: 1.91,
        minimum: 0.8,
        position: 3,
        width: 3000,
      },
    ]);
    expect(mediaFits(fit)).toBeFalsy();
  });

  it("weighs each file against its own type's limit", () => {
    expect(
      mediaFitOn("x", [loaded(file("a", { byteSize: 6 * mebibyte }))]).problems
    ).toStrictEqual([
      {
        _tag: "mediaTooLarge",
        byteSize: 6 * mebibyte,
        kind: "image",
        maximum: 5 * mebibyte,
        position: 1,
      },
    ]);
    expect(
      mediaFitOn("x", [
        loaded(file("a", { byteSize: 6 * mebibyte, contentType: "image/gif" })),
      ]).problems
    ).toStrictEqual([]);
  });

  it("refuses a LinkedIn video smaller than LinkedIn takes", () => {
    expect(
      mediaFitOn("linkedin", [loaded(small(75_000))]).problems
    ).toStrictEqual([]);
    expect(
      mediaFitOn("linkedin", [loaded(small(74_999))]).problems
    ).toStrictEqual([
      {
        _tag: "mediaTooSmall",
        byteSize: 74_999,
        kind: "video",
        minimum: 75_000,
        position: 1,
      },
    ]);
  });

  it("keeps videos within the platform's durations and counts", () => {
    expect(
      mediaFitOn("x", [loaded(video("a", 150_000)), loaded(video("b", 400))])
        .problems
    ).toStrictEqual([
      {
        _tag: "videoTooLong",
        durationMs: 150_000,
        kind: "video",
        maximumMs: 140_000,
        position: 1,
      },
      {
        _tag: "videoTooShort",
        durationMs: 400,
        kind: "video",
        minimumMs: 500,
        position: 2,
      },
      { _tag: "tooManyVideos", count: 2, maximum: 1 },
    ]);
  });

  it("keeps a video apart from images where the platform must", () => {
    const both = [loaded(file("a")), loaded(video("b"))];

    expect(mediaFitOn("mastodon", both).problems).toStrictEqual([
      { _tag: "mixedMedia" },
    ]);
    expect(mediaFitOn("threads", both).problems).toStrictEqual([]);
  });

  it("shows a GIF alone where the platform must", () => {
    const gif = file("a", { contentType: "image/gif" });
    const withPhoto = [loaded(gif), loaded(file("b"))];

    expect(mediaFitOn("x", [loaded(gif)]).problems).toStrictEqual([]);
    expect(mediaFitOn("x", withPhoto).problems).toStrictEqual([
      { _tag: "tooManyMedia", count: 2, maximum: 1 },
    ]);
    expect(mediaFitOn("bluesky", withPhoto).problems).toStrictEqual([]);
  });

  it("checks the alt text against the platform's limit", () => {
    expect(
      mediaFitOn("x", [loaded(file("a"), "😀".repeat(1001))]).problems
    ).toStrictEqual([
      {
        _tag: "altTextTooLong",
        kind: "image",
        length: 1001,
        maximum: 1000,
        position: 1,
      },
    ]);
  });

  it("warns of missing alt text where the platform shows it", () => {
    const attached = [
      loaded(file("a"), " "),
      loaded(file("b")),
      { altText: "", media: Option.none(), mediaId: "c" },
    ];

    expect(mediaFitOn("bluesky", attached).missingAltText).toBe(2);
    // Instagram shows alt text too; TikTok none.
    expect(mediaFitOn("instagram", attached).missingAltText).toBe(2);
    expect(mediaFitOn("tiktok", attached).missingAltText).toBe(0);
    expect(
      (["mastodon", "instagram", "tiktok"] as const).map((platform) =>
        showsAltText(platform)
      )
    ).toStrictEqual([true, true, false]);
  });

  it("checks media once the API described it, and none where no rule is known", () => {
    const pending: AttachedMedia = {
      altText: "",
      media: Option.none(),
      mediaId: "a",
    };

    expect(mediaFitOn("instagram", [pending]).problems).toStrictEqual([]);
    expect(
      mediaFitOn("facebook", [loaded(video("b", 7_200_000))]).problems
    ).toStrictEqual([]);
  });
});

describe("a document attached to a post", () => {
  const pdf = file("d1", {
    byteSize: 2 * mebibyte,
    contentType: "application/pdf",
    dimensions: null,
  });

  const attachedPdf = { altText: "", media: Option.some(pdf), mediaId: "d1" };

  it("fits LinkedIn alone, and needs no alt text", () => {
    expect(mediaFitOn("linkedin", [attachedPdf])).toStrictEqual({
      missingAltText: 0,
      problems: [],
    });
  });

  // Pinterest and Google Business Profile included, as on the server.
  it.each(PlatformSchema.literals.filter((name) => name !== "linkedin"))(
    "fits no other platform: %s",
    (platform) => {
      expect(
        mediaFitOn(platform, [attachedPdf]).problems.filter(
          ({ _tag }) => _tag === "mediaTypeUnsupported"
        )
      ).toStrictEqual([
        {
          _tag: "mediaTypeUnsupported",
          contentType: "application/pdf",
          kind: "document",
          position: 1,
        },
      ]);
    }
  );
});

describe("the media of a story or a reel", () => {
  const story = { format: "story", platform: "instagram" } as const;
  const tall = file("a", { dimensions: { height: 1920, width: 1080 } });

  it("follow the format the channel's options choose", () => {
    expect(
      mediaFits(mediaFitOn("instagram", [loaded(tall)], story))
    ).toBeTruthy();
    expect(mediaFits(mediaFitOn("instagram", [loaded(tall)]))).toBeFalsy();
    expect(
      mediaFitOn("facebook", [loaded(video("a", 91_000))], {
        format: "reel",
        platform: "facebook",
      }).problems.map(({ _tag }) => _tag)
    ).toStrictEqual(["videoTooLong"]);
  });

  it("ask no alt text on a story, which keeps none", () => {
    expect(showsAltText("instagram")).toBeTruthy();
    expect(showsAltText("instagram", story)).toBeFalsy();
    expect(
      mediaFitOn("instagram", [loaded(tall, "")], story).missingAltText
    ).toBe(0);
  });
});
