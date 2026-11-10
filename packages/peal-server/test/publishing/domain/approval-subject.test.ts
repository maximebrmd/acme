import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { approvalSubject } from "#publishing/domain/approval-subject.ts";
import { GoogleBusinessOptions } from "#publishing/domain/google-business-options.ts";
import { LinkedInOptions } from "#publishing/domain/linkedin-options.ts";
import { PinterestOptions } from "#publishing/domain/pinterest-options.ts";
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

  it("covers no options where a channel has none", () => {
    expect(approvalSubject(content, [target("1", Option.none())])).not.toBe(
      subjectWith(new LinkedInOptions({}))
    );
  });
});
