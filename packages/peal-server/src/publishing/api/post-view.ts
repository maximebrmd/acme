import { DateTime, Match, Option, Schema } from "effect";
import type {
  AttemptResult,
  Post as PostView,
  PostOrigin as OriginView,
  PostWarning,
  PublicationAttempt as AttemptView,
  PostTarget as TargetView,
} from "peal-contract";

import type { DroppedChannels } from "#publishing/application/post-presets.ts";
import type { PostWithTargets } from "#publishing/application/post-repository.ts";
import type { RecordedAttempt } from "#publishing/application/publication-journal.ts";
import type { PostOrigin } from "#publishing/domain/post-origin.ts";
import type { PostStatus } from "#publishing/domain/post-status.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { failureReasonOf } from "#publishing/domain/publication-policy.ts";
import type { AttemptOutcome } from "#publishing/domain/publication-policy.ts";
import type { Schedule } from "#publishing/domain/schedule.ts";
import { TargetOptionsSchema } from "#publishing/domain/target-options.ts";

/** What a post's request is told of the channels its sets left out. */
export const droppedWarnings = (
  dropped: readonly DroppedChannels[]
): readonly PostWarning[] =>
  dropped.map(({ channelIds, setId, setName }) => ({
    _tag: "channelsDropped" as const,
    channelIds: [...channelIds],
    channelSetId: setId,
    channelSetName: setName,
  }));

// The domain's options, as plain values the contract describes.
const encodeOptions = Schema.encodeSync(TargetOptionsSchema);

const scheduleView = ({ at, timeZone }: Schedule) => ({ at, timeZone });

const scheduleOf = (status: PostStatus) =>
  Match.valueTags(status, {
    awaitingApproval: ({ schedule }) => scheduleView(schedule),
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

// How a post was created or scheduled, as the contract describes it.
const originView = (origin: PostOrigin): OriginView =>
  Match.valueTags(origin, {
    apiKey: ({ apiKeyId, name }) => ({
      id: apiKeyId,
      name: name ?? null,
      via: "apiKey" as const,
    }),
    application: ({ clientId, name }) => ({
      id: clientId,
      name: name ?? null,
      via: "application" as const,
    }),
    web: () => ({ id: null, name: null, via: "web" as const }),
  });

const originOrNull = (origin: Option.Option<PostOrigin>) =>
  origin.pipe(Option.map(originView), Option.getOrNull);

/**
 * What clients see of a post: what it says, when, where it went, and how
 * it was created and scheduled.
 */
export const postView = ({
  dropped = [],
  post,
  targets,
}: PostWithTargets): PostView => {
  const view: PostView = {
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
    createdVia: originOrNull(post.attribution.createdVia),
    id: post.id,
    outcome: post.status._tag === "finished" ? post.status.outcome : null,
    schedule: scheduleOf(post.status),
    scheduledBy: Option.getOrNull(post.attribution.scheduledBy),
    scheduledVia: originOrNull(post.attribution.scheduledVia),
    status: post.status._tag,
    tagIds: [...post.tagIds],
    targets: targets.map(targetView),
  };

  // Said on the answer of the request that made the post, and only when
  // there is something to say.
  return dropped.length === 0
    ? view
    : { ...view, warnings: droppedWarnings(dropped) };
};

// What an attempt came to, in the words the failure reasons use.
const resultOf = (outcome: AttemptOutcome): AttemptResult =>
  outcome._tag === "published" || outcome._tag === "unconfirmed"
    ? outcome._tag
    : failureReasonOf(outcome);

// The code a refusal came with: the platform's, or Peal's own.
const refusalCodeOf = (outcome: AttemptOutcome): string | null =>
  "code" in outcome && outcome.code !== undefined ? outcome.code : null;

/** What clients see of an attempt: when, how it ended, what came next. */
export const attemptView = (attempt: RecordedAttempt): AttemptView => ({
  attempt: attempt.attempt,
  finishedAt: attempt.finishedAt,
  refusalCode: refusalCodeOf(attempt.outcome),
  result: resultOf(attempt.outcome),
  retryAt: attempt.retryAfter.pipe(
    Option.map((delay) => DateTime.addDuration(attempt.finishedAt, delay)),
    Option.getOrNull
  ),
  round: attempt.round,
  startedAt: attempt.startedAt,
  targetId: attempt.targetId,
});
