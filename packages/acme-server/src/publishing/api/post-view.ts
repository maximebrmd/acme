import type { Post as PostView, PostTarget as TargetView } from "acme-contract";
import { Match, Option } from "effect";

import type { PostWithTargets } from "#publishing/application/post-repository.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Schedule } from "#publishing/domain/schedule.ts";

const scheduleView = ({ at, timeZone }: Schedule) => ({ at, timeZone });

const scheduleOf = (status: PostStatus) =>
  Match.valueTags(status, {
    cancelled: ({ schedule }) =>
      schedule.pipe(Option.map(scheduleView), Option.getOrNull),
    draft: () => null,
    finished: ({ schedule }) => scheduleView(schedule),
    publishing: ({ schedule }) => scheduleView(schedule),
    scheduled: ({ schedule }) => scheduleView(schedule),
  });

const targetView = ({ channelId, id, status }: PostTarget): TargetView => ({
  channelId,
  failureReason: status._tag === "failed" ? status.reason : null,
  id,
  permalink:
    status._tag === "published" ? Option.getOrNull(status.permalink) : null,
  publishedAt: status._tag === "published" ? status.publishedAt : null,
  status: status._tag,
});

/** What clients see of a post: what it says, when, and where it went. */
export const postView = ({ post, targets }: PostWithTargets): PostView => ({
  content: {
    media: post.content.media.map(({ altText, mediaId }) => ({
      altText,
      mediaId,
    })),
    overrides: post.content.overrides.map(({ channelId, text }) => ({
      channelId,
      text,
    })),
    text: post.content.text,
  },
  id: post.id,
  outcome: post.status._tag === "finished" ? post.status.outcome : null,
  schedule: scheduleOf(post.status),
  status: post.status._tag,
  targets: targets.map(targetView),
});
