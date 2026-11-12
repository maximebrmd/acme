import { describe, expect, it } from "@effect/vitest";
import { Duration, Option, Result, Schema } from "effect";

import { approvalSubject } from "#publishing/domain/approval-subject.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import {
  checkPublishable,
  namedMediaViolationsOn,
} from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import type { ContentViolation } from "#publishing/domain/content-violation.ts";
import {
  FacebookOptions,
  maxFacebookVideoTitleLength,
} from "#publishing/domain/facebook-options.ts";
import {
  InstagramOptions,
  maxInstagramAudioNameLength,
} from "#publishing/domain/instagram-options.ts";
import {
  keepingMedia,
  mediaNamedBy,
  referencedMedia,
} from "#publishing/domain/named-media.ts";
import { platformRules } from "#publishing/domain/platform-rules.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import { createTarget } from "#publishing/domain/post-target.ts";
import {
  describeOptionsOn,
  mediaOptionFields,
  optionProblemsOn,
  takesOptions,
  TargetOptionsSchema,
} from "#publishing/domain/target-options.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import {
  maxTikTokPhotoTitleLength,
  TikTokOptions,
} from "#publishing/domain/tiktok-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
} from "#shared/domain/ids.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { contentOf, mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const youtube = channel("1", "youtube");

const tiktok = channel("2", "tiktok");

const instagram = channel("3", "instagram");

const facebook = channel("4", "facebook");

const media = (suffix: string): MediaAssetId =>
  MediaAssetIdSchema.make(`00000000-0000-7000-8000-0000000000${suffix}`);

const video = media("a1");

const photo = media("a2");

const otherPhoto = media("a3");

const thumbnail = media("b1");

const videoFile = mediaFile(video, {
  byteSize: 5_000_000,
  contentType: "video/mp4",
  dimensions: Option.some({ height: 1920, width: 1080 }),
  duration: Option.some(Duration.seconds(30)),
});

const photoFile = mediaFile(photo);

const otherPhotoFile = mediaFile(otherPhoto);

const thumbnailFile = mediaFile(thumbnail, { contentType: "image/png" });

const decode = Schema.decodeUnknownExit(TargetOptionsSchema);

const fields = (platform: Platform) =>
  describeOptionsOn(platform).map((field) =>
    "_tag" in field ? field : [field.name, field.type, field.required]
  );

const violationsOf = (
  result: Result.Result<
    unknown,
    { readonly violations: readonly ContentViolation[] }
  >
): readonly ContentViolation[] =>
  Option.match(Result.getFailure(result), {
    onNone: () => [],
    onSome: ({ violations }) => violations,
  });

const on = (target: ChannelOnPlatform, options: TargetOptions) =>
  new ChannelOptions({ channelId: target.channelId, options });

const invalid = (target: ChannelOnPlatform, field: string) => ({
  _tag: "optionInvalid",
  ...target,
  field,
});

// Only what the options are refused for, given the post's media.
const optionViolations = (
  target: ChannelOnPlatform,
  options: TargetOptions,
  mediaIds: readonly MediaAssetId[],
  files = [videoFile, photoFile, otherPhotoFile, thumbnailFile]
) =>
  violationsOf(
    checkPublishable(
      contentOf("A synthetic post", { media: mediaIds }),
      [target],
      files,
      [on(target, options)]
    )
  ).filter(({ _tag }) => _tag === "optionInvalid");

const youTubeBasics = { madeForKids: false, title: "A synthetic video" };

const collaboratorProblems = (collaborators: readonly string[]) =>
  new InstagramOptions({ collaborators }).problems();

const youTubeProblems = (options: Partial<YouTubeOptions>) =>
  new YouTubeOptions({ ...youTubeBasics, ...options }).problems();

const photoTitleProblems = (photoTitle: string) =>
  new TikTokOptions({ photoTitle, privacyLevel: "SELF_ONLY" }).problems();

const youTubeTarget = (options: TargetOptions) =>
  createTarget(
    PostTargetIdSchema.make("00000000-0000-7000-8000-0000000000c1"),
    PostIdSchema.make("00000000-0000-7000-8000-0000000000c2"),
    youtube.channelId,
    Option.some(options)
  );

describe("the options of Instagram and Facebook", () => {
  it("are taken, and need nothing", () => {
    for (const platform of ["instagram", "facebook"] as const) {
      expect(takesOptions(platform)).toBeTruthy();
      expect(optionProblemsOn(platform, Option.none())).toStrictEqual([]);
    }
  });

  it.each([
    [
      {
        audioName: "Synthetic theme",
        collaborators: ["synthetic.friend", "another_one"],
        coverMediaId: thumbnail,
        platform: "instagram",
        shareToFeed: true,
        thumbOffsetMs: 1500,
        trialReel: "performance",
      },
      "Success",
    ],
    [{ platform: "instagram", trialReel: "MANUAL" }, "Failure"],
    [{ collaborators: ["a", "b", "c", "d"], platform: "instagram" }, "Failure"],
    [{ coverMediaId: "not an id", platform: "instagram" }, "Failure"],
    [{ platform: "instagram", thumbOffsetMs: -1 }, "Failure"],
    [{ platform: "facebook", videoTitle: "A synthetic title" }, "Success"],
    [{ platform: "facebook", videoTitle: 12 }, "Failure"],
  ] as const)("decode %j to a %s", (input, outcome) => {
    expect(decode(input)._tag).toBe(outcome);
  });

  it("describe every field to clients, the files they name as media", () => {
    expect(fields("instagram")).toStrictEqual([
      ["audioName", "text", false],
      ["collaborators", "textList", false],
      ["coverMediaId", "media", false],
      ["format", "choice", false],
      ["shareToFeed", "boolean", false],
      ["thumbOffsetMs", "integer", false],
      ["trialReel", "choice", false],
    ]);
    expect(fields("facebook")).toStrictEqual([
      ["format", "choice", false],
      ["videoTitle", "text", false],
    ]);
  });

  it("take collaborators as one to three usernames, each once", () => {
    expect(collaboratorProblems(["synthetic.friend"])).toStrictEqual([]);
    expect(collaboratorProblems([])).toStrictEqual([
      { _tag: "invalid", field: "collaborators" },
    ]);
    expect(collaboratorProblems(["not a username"])).toStrictEqual([
      { _tag: "invalid", field: "collaborators" },
    ]);
    expect(collaboratorProblems(["Same.One", "same.one"])).toStrictEqual([
      { _tag: "invalid", field: "collaborators" },
    ]);
  });

  it("take an audio name and a video title on one line, within Peal's ceilings", () => {
    expect(
      new InstagramOptions({
        audioName: "a".repeat(maxInstagramAudioNameLength + 1),
      }).problems()
    ).toStrictEqual([
      {
        _tag: "tooLong",
        field: "audioName",
        length: maxInstagramAudioNameLength + 1,
        maximum: maxInstagramAudioNameLength,
      },
    ]);
    expect(
      new InstagramOptions({ audioName: "Two\nlines" }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "audioName" }]);
    expect(
      new FacebookOptions({
        videoTitle: "a".repeat(maxFacebookVideoTitleLength + 1),
      }).problems()
    ).toStrictEqual([
      {
        _tag: "tooLong",
        field: "videoTitle",
        length: maxFacebookVideoTitleLength + 1,
        maximum: maxFacebookVideoTitleLength,
      },
    ]);
    expect(
      new FacebookOptions({ videoTitle: "Two\nlines" }).problems()
    ).toStrictEqual([{ _tag: "invalid", field: "videoTitle" }]);
  });
});

describe("YouTube's and TikTok's new options", () => {
  it("describe every field to clients", () => {
    expect(fields("youtube")).toStrictEqual([
      ["categoryId", "text", false],
      ["containsSyntheticMedia", "boolean", false],
      ["defaultLanguage", "text", false],
      ["embeddable", "boolean", false],
      ["license", "choice", false],
      ["madeForKids", "boolean", true],
      ["notifySubscribers", "boolean", false],
      ["privacy", "choice", false],
      ["publicStatsViewable", "boolean", false],
      ["recordingDate", "text", false],
      ["tags", "textList", false],
      ["thumbnailMediaId", "media", false],
      ["title", "text", true],
    ]);
    expect(fields("tiktok")).toStrictEqual([
      ["aiGenerated", "boolean", false],
      ["autoAddMusic", "boolean", false],
      ["brandContent", "boolean", false],
      ["brandOrganic", "boolean", false],
      ["commercialContent", "boolean", false],
      ["disableComment", "boolean", false],
      ["disableDuet", "boolean", false],
      ["disableStitch", "boolean", false],
      ["photoCoverIndex", "integer", false],
      ["photoTitle", "text", false],
      ["privacyLevel", "choice", true],
      ["videoCoverTimestampMs", "integer", false],
    ]);
  });

  it("tell clients which files a thumbnail may be", () => {
    expect(
      describeOptionsOn("youtube").find(
        (field) => field.name === "thumbnailMediaId"
      )
    ).toMatchObject({
      contentTypes: ["image/jpeg", "image/png"],
      maxByteSize: 8 * 1024 * 1024,
      type: "media",
    });
  });

  it("take a default language as a BCP 47 tag and a recording date as a day", () => {
    expect(
      youTubeProblems({ defaultLanguage: "pt-BR", recordingDate: "2026-02-28" })
    ).toStrictEqual([]);
    expect(youTubeProblems({ defaultLanguage: "Portuguese" })).toStrictEqual([
      { _tag: "invalid", field: "defaultLanguage" },
    ]);
    expect(youTubeProblems({ recordingDate: "2026-11-31" })).toStrictEqual([
      { _tag: "invalid", field: "recordingDate" },
    ]);
    expect(youTubeProblems({ recordingDate: "27/11/2026" })).toStrictEqual([
      { _tag: "invalid", field: "recordingDate" },
    ]);
  });

  it("take a photo title of 90 UTF-16 units, as TikTok counts them", () => {
    expect(
      photoTitleProblems("a".repeat(maxTikTokPhotoTitleLength))
    ).toStrictEqual([]);
    // An emoji is two units.
    expect(photoTitleProblems("😀".repeat(46))).toStrictEqual([
      {
        _tag: "tooLong",
        field: "photoTitle",
        length: 92,
        maximum: maxTikTokPhotoTitleLength,
      },
    ]);
  });
});

describe("a file an option names", () => {
  const youTubeOptions = new YouTubeOptions({
    ...youTubeBasics,
    thumbnailMediaId: thumbnail,
  });

  it("is listed with the option that names it", () => {
    expect(mediaNamedBy(youTubeOptions)).toStrictEqual([
      { field: "thumbnailMediaId", mediaId: thumbnail },
    ]);
    expect(
      mediaNamedBy(new InstagramOptions({ coverMediaId: photo }))
    ).toStrictEqual([{ field: "coverMediaId", mediaId: photo }]);
    expect(mediaNamedBy(new TikTokOptions({}))).toStrictEqual([]);
    expect(mediaOptionFields.toSorted()).toStrictEqual([
      "coverMediaId",
      "thumbnailMediaId",
    ]);
  });

  it("is a file the post depends on, after those it shows, each once", () => {
    const content = new PostContent({
      followUps: [
        new PostPart({
          delaySeconds: 0,
          media: contentOf("", { media: [photo] }).media,
          overrides: [],
          text: "A second part",
        }),
      ],
      media: contentOf("", { media: [video] }).media,
      overrides: [],
      text: "A synthetic post",
    });

    expect(
      referencedMedia(content, [
        on(youtube, youTubeOptions),
        on(instagram, new InstagramOptions({ coverMediaId: photo })),
      ])
    ).toStrictEqual([video, photo, thumbnail]);
  });

  it("is dropped from options once gone, the others kept", () => {
    expect(keepingMedia(youTubeOptions, () => false)).toStrictEqual(
      new YouTubeOptions(youTubeBasics)
    );
    expect(keepingMedia(youTubeOptions, () => true)).toBe(youTubeOptions);
  });

  it("changes what an approval covers", () => {
    const content = contentOf("A synthetic post", { media: [video] });

    expect(approvalSubject(content, [youTubeTarget(youTubeOptions)])).not.toBe(
      approvalSubject(content, [
        youTubeTarget(
          new YouTubeOptions({ ...youTubeBasics, thumbnailMediaId: photo })
        ),
      ])
    );
  });

  it("cannot be saved where a post's options are only a starting point", () => {
    expect(namedMediaViolationsOn(youtube, youTubeOptions)).toStrictEqual([
      invalid(youtube, "thumbnailMediaId"),
    ]);
    expect(
      namedMediaViolationsOn(youtube, new YouTubeOptions(youTubeBasics))
    ).toStrictEqual([]);
  });

  it("must be a JPEG or PNG of 8 MiB at most for a YouTube thumbnail", () => {
    const options = new YouTubeOptions({
      ...youTubeBasics,
      thumbnailMediaId: thumbnail,
    });

    expect(optionViolations(youtube, options, [video])).toStrictEqual([]);
    expect(
      optionViolations(
        youtube,
        options,
        [video],
        [videoFile, mediaFile(thumbnail, { contentType: "image/webp" })]
      )
    ).toStrictEqual([invalid(youtube, "thumbnailMediaId")]);
    expect(
      optionViolations(
        youtube,
        options,
        [video],
        [videoFile, mediaFile(thumbnail, { byteSize: 8 * 1024 * 1024 + 1 })]
      )
    ).toStrictEqual([invalid(youtube, "thumbnailMediaId")]);
    expect(
      optionViolations(
        youtube,
        options,
        [video],
        [videoFile, mediaFile(thumbnail, { contentType: "video/mp4" })]
      )
    ).toStrictEqual([invalid(youtube, "thumbnailMediaId")]);
  });

  it("must be a JPEG for an Instagram reel's cover", () => {
    expect(
      optionViolations(
        instagram,
        new InstagramOptions({ coverMediaId: thumbnail }),
        [video]
      )
    ).toStrictEqual([invalid(instagram, "coverMediaId")]);
    expect(
      optionViolations(
        instagram,
        new InstagramOptions({ coverMediaId: photo }),
        [video]
      )
    ).toStrictEqual([]);
  });
});

describe("options that depend on the post's media", () => {
  it("give a TikTok video its cover frame within the video", () => {
    expect(
      optionViolations(
        tiktok,
        new TikTokOptions({
          privacyLevel: "SELF_ONLY",
          videoCoverTimestampMs: 29_999,
        }),
        [video]
      )
    ).toStrictEqual([]);
    expect(
      optionViolations(
        tiktok,
        new TikTokOptions({
          privacyLevel: "SELF_ONLY",
          videoCoverTimestampMs: 30_000,
        }),
        [video]
      )
    ).toStrictEqual([invalid(tiktok, "videoCoverTimestampMs")]);
    expect(
      optionViolations(
        tiktok,
        new TikTokOptions({
          privacyLevel: "SELF_ONLY",
          videoCoverTimestampMs: 0,
        }),
        [photo]
      )
    ).toStrictEqual([invalid(tiktok, "videoCoverTimestampMs")]);
  });

  it("give a TikTok photo post its title, music and cover among its photos", () => {
    const photoPost = new TikTokOptions({
      autoAddMusic: true,
      photoCoverIndex: 1,
      photoTitle: "Synthetic photos",
      privacyLevel: "SELF_ONLY",
    });

    expect(
      optionViolations(tiktok, photoPost, [photo, otherPhoto])
    ).toStrictEqual([]);
    expect(optionViolations(tiktok, photoPost, [photo])).toStrictEqual([
      invalid(tiktok, "photoCoverIndex"),
    ]);
    expect(optionViolations(tiktok, photoPost, [video])).toStrictEqual([
      invalid(tiktok, "autoAddMusic"),
      invalid(tiktok, "photoCoverIndex"),
      invalid(tiktok, "photoTitle"),
    ]);
  });

  it("give an Instagram reel its settings, and nothing else", () => {
    const reel = new InstagramOptions({
      audioName: "Synthetic theme",
      shareToFeed: false,
      thumbOffsetMs: 1000,
      trialReel: "manual",
    });

    expect(optionViolations(instagram, reel, [video])).toStrictEqual([]);
    expect(optionViolations(instagram, reel, [photo])).toStrictEqual([
      invalid(instagram, "audioName"),
      invalid(instagram, "shareToFeed"),
      invalid(instagram, "thumbOffsetMs"),
      invalid(instagram, "trialReel"),
    ]);
    expect(
      optionViolations(instagram, reel, [video, photo]).map((violation) =>
        "field" in violation ? violation.field : violation._tag
      )
    ).toStrictEqual(["audioName", "shareToFeed", "thumbOffsetMs", "trialReel"]);
    expect(
      optionViolations(
        instagram,
        new InstagramOptions({ thumbOffsetMs: 30_000 }),
        [video]
      )
    ).toStrictEqual([invalid(instagram, "thumbOffsetMs")]);
    expect(
      optionViolations(
        instagram,
        new InstagramOptions({ collaborators: ["synthetic.friend"] }),
        [photo, otherPhoto]
      )
    ).toStrictEqual([]);
  });

  it("give a Facebook video its title, never a post without one", () => {
    const titled = new FacebookOptions({ videoTitle: "A synthetic title" });

    expect(optionViolations(facebook, titled, [video])).toStrictEqual([]);
    expect(optionViolations(facebook, titled, [photo])).toStrictEqual([
      invalid(facebook, "videoTitle"),
    ]);
    expect(optionViolations(facebook, titled, [])).toStrictEqual([
      invalid(facebook, "videoTitle"),
    ]);
  });
});

describe("Instagram's alt text", () => {
  it("is shown on images, up to 1,000 characters", () => {
    expect(platformRules.instagram.media?.showsAltText).toBeTruthy();
    expect(platformRules.instagram.media?.maxAltTextLength).toBe(1000);
  });
});
