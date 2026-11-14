import { describe, expect, it } from "@effect/vitest";
import { Option, Result, Schema } from "effect";

import { checkPublishable } from "#publishing/domain/content-rules.ts";
import type { ChannelOnPlatform } from "#publishing/domain/content-rules.ts";
import { MediaAttachment } from "#publishing/domain/media-attachment.ts";
import { platformRules } from "#publishing/domain/platform-rules.ts";
import { Poll } from "#publishing/domain/poll.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { ChannelIdSchema, MediaAssetIdSchema } from "#shared/domain/ids.ts";
import { platforms } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { mediaFile } from "#test/publishing/support.ts";

const channel = (suffix: string, platform: Platform): ChannelOnPlatform => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  platform,
});

const x = channel("1", "x");
const mastodon = channel("2", "mastodon");
const threads = channel("3", "threads");
const bluesky = channel("4", "bluesky");

const asking = (
  poll: Poll,
  media: readonly MediaAttachment[] = []
): PostContent =>
  new PostContent({
    media,
    overrides: [],
    poll: Option.some(poll),
    text: "Which one?",
  });

const violationsOf = (
  content: PostContent,
  channels: readonly ChannelOnPlatform[],
  files: Parameters<typeof checkPublishable>[2] = []
) =>
  Option.match(Result.getFailure(checkPublishable(content, channels, files)), {
    onNone: () => [],
    onSome: ({ violations }) => violations,
  });

const twoChoices = new Poll({ choices: ["Yes", "No"], durationMinutes: 1440 });

describe("the platforms that take a poll", () => {
  it("are X, Mastodon and Threads", () => {
    expect(
      platforms.filter((platform) => platformRules[platform].poll !== undefined)
    ).toStrictEqual(["x", "mastodon", "threads"]);
  });
});

describe("a poll", () => {
  it("goes with a post on every platform that takes one", () => {
    expect(
      violationsOf(asking(twoChoices), [x, mastodon, threads])
    ).toStrictEqual([]);
  });

  it("is refused on a platform Peal sends none to, by name", () => {
    expect(violationsOf(asking(twoChoices), [bluesky])).toStrictEqual([
      { _tag: "pollNotSupported", ...bluesky },
    ]);
  });

  it("needs two to four choices", () => {
    expect(
      violationsOf(
        asking(new Poll({ choices: ["Alone"], durationMinutes: 60 })),
        [x]
      )
    ).toStrictEqual([
      { _tag: "pollChoiceCount", ...x, count: 1, maximum: 4, minimum: 2 },
    ]);
  });

  it("holds each choice to the platform's length, and refuses an empty one", () => {
    const long = "a".repeat(26);

    expect(
      violationsOf(
        asking(new Poll({ choices: ["Fine", long, ""], durationMinutes: 60 })),
        [x, mastodon]
      )
    ).toStrictEqual([
      {
        _tag: "pollChoiceLength",
        ...x,
        choice: 2,
        length: 26,
        maximum: 25,
        unit: "codePoints",
      },
      {
        _tag: "pollChoiceLength",
        ...x,
        choice: 3,
        length: 0,
        maximum: 25,
        unit: "codePoints",
      },
      {
        _tag: "pollChoiceLength",
        ...mastodon,
        choice: 3,
        length: 0,
        maximum: 50,
        unit: "codePoints",
      },
    ]);
  });

  it("stays open as long as the platform takes, where it sets a time", () => {
    const week = new Poll({ choices: ["A", "B"], durationMinutes: 20_160 });

    expect(violationsOf(asking(week), [x, mastodon, threads])).toStrictEqual([
      {
        _tag: "pollDurationOutOfRange",
        ...x,
        durationMinutes: 20_160,
        maximumMinutes: 10_080,
        minimumMinutes: 5,
      },
    ]);
  });

  it("lets readers pick several only where the platform does", () => {
    const several = new Poll({
      choices: ["A", "B"],
      durationMinutes: 60,
      multipleChoice: true,
    });

    expect(violationsOf(asking(several), [x, mastodon, threads])).toStrictEqual(
      [
        { _tag: "pollMultipleChoice", ...x },
        { _tag: "pollMultipleChoice", ...threads },
      ]
    );
  });

  it("refuses a choice that repeats one before it", () => {
    expect(
      violationsOf(
        asking(
          new Poll({ choices: ["Tea", "Coffee", "Tea"], durationMinutes: 60 })
        ),
        [mastodon]
      )
    ).toStrictEqual([{ _tag: "pollChoiceRepeated", ...mastodon, choice: 3 }]);
  });

  it("keeps choices without the spaces around them", () => {
    expect(
      Schema.decodeUnknownSync(Poll)({
        choices: [" Tea ", "Coffee  "],
        durationMinutes: 60,
      }).choices
    ).toStrictEqual(["Tea", "Coffee"]);
  });

  it("goes with no file", () => {
    const mediaId = MediaAssetIdSchema.make(
      "00000000-0000-7000-8000-000000000201"
    );

    expect(
      violationsOf(
        asking(twoChoices, [new MediaAttachment({ altText: "", mediaId })]),
        [mastodon],
        [mediaFile(mediaId)]
      )
    ).toStrictEqual([{ _tag: "pollWithMedia", ...mastodon }]);
  });

  it("decodes a post stored before polls as one without", () => {
    expect(
      Schema.decodeUnknownSync(PostContent)({
        media: [],
        overrides: [],
        text: "Old",
      }).poll
    ).toStrictEqual(Option.none());
  });
});
