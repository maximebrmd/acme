import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { channelsView } from "#review/api/review-view.ts";
import type { ReviewedPost } from "#review/application/ports/reviewed-posts.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

const picture = MediaAssetIdSchema.make("00000000-0000-7000-8000-00000000a0e1");

const channel = (
  suffix: string,
  media: ReviewedPost["channels"][number]["media"]
) => ({
  channelId: ChannelIdSchema.make(
    `00000000-0000-7000-8000-00000000000${suffix}`
  ),
  followUps: [],
  handle: Option.some(`@channel${suffix}`),
  media,
  options: Option.none(),
  platform: Option.some("mastodon" as const),
  text: "A synthetic post",
});

const post: ReviewedPost = {
  authorId: Option.none(),
  channels: [
    channel(
      "1",
      Option.some([{ altText: "A synthetic picture", mediaId: picture }])
    ),
    channel("2", Option.none()),
  ],
  media: [],
  postId: PostIdSchema.make("00000000-0000-7000-8000-000000000010"),
  schedule: Option.none(),
  status: "awaitingApproval",
  workspaceId: WorkspaceIdSchema.make("00000000-0000-4000-8000-000000000001"),
};

describe(channelsView, () => {
  it("shows a channel's own files, and none where it shows the post's", () => {
    const [own, other] = channelsView(
      post,
      new Map([
        [
          picture,
          {
            contentType: "image/jpeg",
            kind: "image" as const,
            url: "https://media.example.test/picture",
          },
        ],
      ])
    );

    expect(own?.media).toStrictEqual([
      {
        altText: "A synthetic picture",
        kind: "image",
        mediaId: picture,
        url: "https://media.example.test/picture",
      },
    ]);
    expect(other).not.toHaveProperty("media");
  });
});
