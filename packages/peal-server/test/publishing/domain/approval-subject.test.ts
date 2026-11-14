import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  approvalSubject,
  channelsOfSubject,
} from "#publishing/domain/approval-subject.ts";
import { FacebookOptions } from "#publishing/domain/facebook-options.ts";
import { GoogleBusinessOptions } from "#publishing/domain/google-business-options.ts";
import { LinkedInOptions } from "#publishing/domain/linkedin-options.ts";
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
import { Poll } from "#publishing/domain/poll.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import type { TargetOptions } from "#publishing/domain/target-options.ts";
import { YouTubeOptions } from "#publishing/domain/youtube-options.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import { contentOf } from "#test/publishing/support.ts";

const postId = PostIdSchema.make("00000000-0000-7000-8000-0000000000a1");

const target = (suffix: string, options: Option.Option<TargetOptions>) =>
  new PostTarget({
    channelId: ChannelIdSchema.make(
      `00000000-0000-7000-8000-00000000000${suffix}`
    ),
    id: PostTargetIdSchema.make(`00000000-0000-7000-8000-0000000000b${suffix}`),
    liveParts: [],
    options,
    postId,
    round: 1,
    status: { _tag: "pending" },
  });

const content = contentOf("Launch day, with @Example Bakery");

// What an approval of the post covers, with these options on its channel.
const subjectWith = (options: TargetOptions) =>
  approvalSubject(content, [target("1", Option.some(options))]);

const bakery = {
  name: "Example Bakery",
  urn: "urn:li:organization:9000000001",
};

describe("what an approval of a post covers", () => {
  it.each([
    [
      "a Pin's board",
      new PinterestOptions({ boardId: "549755885001" }),
      new PinterestOptions({ boardId: "549755885002" }),
    ],
    [
      "a Pin's board section",
      new PinterestOptions({ boardId: "549755885001" }),
      new PinterestOptions({
        boardId: "549755885001",
        boardSectionId: "5000000000001",
      }),
    ],
    [
      "a Google Business Profile post's type",
      new GoogleBusinessOptions({}),
      new GoogleBusinessOptions({ postType: "offer" }),
    ],
    [
      "a Google Business Profile event's dates",
      new GoogleBusinessOptions({
        endsAt: "2026-11-27T18:00",
        postType: "event",
        startsAt: "2026-11-27T09:00",
        title: "Synthetic open day",
      }),
      new GoogleBusinessOptions({
        endsAt: "2026-11-28T18:00",
        postType: "event",
        startsAt: "2026-11-27T09:00",
        title: "Synthetic open day",
      }),
    ],
    [
      "the page a LinkedIn post mentions",
      new LinkedInOptions({ mentions: [bakery] }),
      new LinkedInOptions({
        mentions: [{ ...bakery, urn: "urn:li:organization:2414184" }],
      }),
    ],
    [
      "a LinkedIn mention taken away",
      new LinkedInOptions({ mentions: [bakery] }),
      new LinkedInOptions({}),
    ],
    [
      "who sees a LinkedIn post",
      new LinkedInOptions({ visibility: "public" }),
      new LinkedInOptions({ visibility: "connections" }),
    ],
    [
      "a YouTube video's title",
      new YouTubeOptions({ madeForKids: false, title: "A title" }),
      new YouTubeOptions({ madeForKids: false, title: "Another title" }),
    ],
  ])(
    "is another once %s changes, so the approval no longer stands",
    (_what, before, after) => {
      expect(subjectWith(after)).not.toBe(subjectWith(before));
    }
  );

  it("is the same for the same options, however they were built", () => {
    expect(
      subjectWith(
        new PinterestOptions({ boardId: "549755885001", title: "Tomato salad" })
      )
    ).toBe(
      subjectWith(
        new PinterestOptions({ boardId: "549755885001", title: "Tomato salad" })
      )
    );
    expect(subjectWith(new LinkedInOptions({ mentions: [bakery] }))).toBe(
      subjectWith(
        new LinkedInOptions({
          mentions: [{ name: bakery.name, urn: bakery.urn }],
        })
      )
    );
  });

  it("covers every part that follows the first", () => {
    const thread = (text: string, delaySeconds = 0) =>
      approvalSubject(
        new PostContent({
          followUps: [
            new PostPart({ delaySeconds, media: [], overrides: [], text }),
          ],
          media: content.media,
          overrides: content.overrides,
          text: content.text,
        }),
        [target("1", Option.none())]
      );

    const alone = approvalSubject(content, [target("1", Option.none())]);

    expect(thread("And more tomorrow")).not.toBe(alone);
    expect(thread("And more on Friday")).not.toBe(thread("And more tomorrow"));
    expect(thread("And more tomorrow", 60)).not.toBe(
      thread("And more tomorrow")
    );
    expect(thread("And more tomorrow")).toBe(thread("And more tomorrow"));
  });

  it("is written for a post of one part as before posts had parts", () => {
    expect(
      JSON.parse(approvalSubject(content, [target("1", Option.none())]))
    ).toStrictEqual({
      channels: [
        { channelId: "00000000-0000-7000-8000-000000000001", options: null },
      ],
      media: [],
      overrides: [],
      text: "Launch day, with @Example Bakery",
    });
  });

  it("changes when a format is chosen: a story is not the feed post approved", () => {
    expect(subjectWith(new FacebookOptions({ format: "story" }))).not.toBe(
      subjectWith(new FacebookOptions({}))
    );
    expect(subjectWith(new FacebookOptions({ format: "reel" }))).not.toBe(
      subjectWith(new FacebookOptions({ format: "story" }))
    );
  });

  it("covers no options where a channel has none", () => {
    expect(approvalSubject(content, [target("1", Option.none())])).not.toBe(
      subjectWith(new LinkedInOptions({}))
    );
  });
});

describe(channelsOfSubject, () => {
  it("reads back the channels a subject names", () => {
    const subject = approvalSubject(content, [
      target("2", Option.none()),
      target("1", Option.none()),
    ]);

    expect(channelsOfSubject(subject)).toStrictEqual([
      "00000000-0000-7000-8000-000000000001",
      "00000000-0000-7000-8000-000000000002",
    ]);
  });

  it("names none of a string that is not a subject", () => {
    expect(channelsOfSubject("not a subject")).toStrictEqual([]);
  });
});

const asking = (poll: Poll) =>
  new PostContent({
    media: [],
    overrides: [],
    poll: Option.some(poll),
    text: content.text,
  });

describe("what an approval of a post with a poll covers", () => {
  const yesNo = new Poll({ choices: ["Yes", "No"], durationMinutes: 1440 });
  const targets = [target("1", Option.none())];

  it("covers the poll, its choices and how long it stays open", () => {
    const subject = approvalSubject(asking(yesNo), targets);

    expect(subject).not.toBe(approvalSubject(content, targets));
    expect(subject).not.toBe(
      approvalSubject(
        asking(new Poll({ choices: ["Yes", "Maybe"], durationMinutes: 1440 })),
        targets
      )
    );
    expect(subject).not.toBe(
      approvalSubject(
        asking(new Poll({ choices: ["Yes", "No"], durationMinutes: 60 })),
        targets
      )
    );
    expect(subject).toBe(approvalSubject(asking(yesNo), targets));
  });

  it("leaves a post without one as it was written before polls", () => {
    expect(JSON.parse(approvalSubject(content, targets))).not.toHaveProperty(
      "poll"
    );
  });

  it("covers a first comment, the part after the post", () => {
    const commented = new PostContent({
      followUps: [
        new PostPart({
          delaySeconds: 0,
          media: [],
          overrides: [],
          text: "The link is in here",
        }),
      ],
      media: [],
      overrides: [],
      text: content.text,
    });

    expect(approvalSubject(commented, targets)).not.toBe(
      approvalSubject(content, targets)
    );
  });
});
