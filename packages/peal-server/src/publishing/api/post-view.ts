import type {
  AttemptResult,
  Post as PostView,
  PublicationAttempt as AttemptView,
  PostTarget as TargetView,
} from "peal-contract";
import { DateTime, Match, Option, Schema } from "effect";

import type { PostWithTargets } from "#publishing/application/post-repository.ts";
import type { RecordedAttempt } from "#publishing/application/publication-journal.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { failureReasonOf } from "#publishing/domain/publication-policy.ts";
import type { AttemptOutcome } from "#publishing/domain/publication-policy.ts";
import type { Schedule } from "#publishing/domain/schedule.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";

// The domain's options, as plain values the contract describes.
const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

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

const targetView = ({
  channelId,
  id,
  options,
  round,
  status,
}: PostTarget): TargetView => {
  const view: TargetView = {
    channelId,
    failureReason: status._tag === "failed" ? status.reason : null,
    id,
    options: options.pipe(Option.map(encodeOptions), Option.getOrNull),
    permalink:
      status._tag === "published" ? Option.getOrNull(status.permalink) : null,
    publishedAt: status._tag === "published" ? status.publishedAt : null,
    round,
    status: status._tag,
    unconfirmedReason: status._tag === "unconfirmed" ? status.reason : null,
  };

  return status._tag === "published" && status.keptPrivate === true
    ? { ...view, keptPrivate: true }
    : view;
};

/** What clients see of a post: what it says, when, and where it went. */
export const postView = ({ post, targets }: PostWithTargets): PostView => ({
  authorId: Option.getOrNull(post.authorId),
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

// What an attempt came to, in the words the failure reasons use.
const resultOf = (outcome: AttemptOutcome): AttemptResult =>
  outcome._tag === "published" || outcome._tag === "unconfirmed"
    ? outcome._tag
    : failureReasonOf(outcome);

/** What clients see of an attempt: when, how it ended, what came next. */
export const attemptView = (attempt: RecordedAttempt): AttemptView => ({
  attempt: attempt.attempt,
  finishedAt: attempt.finishedAt,
  result: resultOf(attempt.outcome),
  retryAt: attempt.retryAfter.pipe(
    Option.map((delay) => DateTime.addDuration(attempt.finishedAt, delay)),
    Option.getOrNull
  ),
  round: attempt.round,
  startedAt: attempt.startedAt,
  targetId: attempt.targetId,
});
