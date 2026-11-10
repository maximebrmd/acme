import { Effect, Option } from "effect";
import type {
  ChannelPreview as PreviewView,
  CurrentMember,
  LimitedCount as CountView,
  PlanShortfall,
  PostValidation,
} from "peal-contract";

import { isSendable } from "#publishing/application/post-checks.ts";
import type { PostCheck } from "#publishing/application/post-checks.ts";
import type {
  ChannelPreview,
  LimitedCount,
} from "#publishing/domain/channel-preview.ts";
import type { LimitRefusal } from "#shared/api/limit-reached.ts";

import type { CheckInputRead } from "./post-check-input.ts";
import { droppedWarnings } from "./post-view.ts";

const countView = ({ count, maximum }: LimitedCount): CountView => ({
  count,
  maximum: maximum ?? null,
});

const previewView = (preview: ChannelPreview): PreviewView => ({
  channelId: preview.channel.channelId,
  hashtags: countView(preview.hashtags),
  links: countView(preview.links),
  media: countView(preview.media),
  mentions: countView(preview.mentions),
  platform: preview.channel.platform,
  text: preview.text,
  textCounts: preview.textCounts.map(({ length, maximum, unit }) => ({
    length,
    maximum,
    unit,
  })),
  violations: [...preview.violations],
});

/**
 * What clients see of a check: the use case's answer, with the ids the
 * request wrote that name nothing, the zone it gave when it is none, and
 * the plan's limit as PlanLimitReached tells it (`shortfall`).
 */
const validationView = (
  check: PostCheck,
  read: CheckInputRead,
  shortfall: Option.Option<PlanShortfall>
): PostValidation => {
  const schedule = read.zoneKnown
    ? Option.getOrNull(check.schedule)
    : "invalidTimeZone";

  const view: PostValidation = {
    awaitsApproval: check.awaitsApproval,
    channels: check.channels.map(previewView),
    duplicates: check.duplicates.map(({ channelId, postId }) => ({
      channelId,
      postId,
    })),
    planLimit: Option.getOrNull(shortfall),
    schedule,
    unknownChannels: [...read.malformedChannels, ...check.unknownChannels],
    unknownMedia: [...read.malformedMedia, ...check.unknownMedia],
    valid:
      isSendable(check) &&
      read.zoneKnown &&
      read.malformedChannels.length === 0 &&
      read.malformedMedia.length === 0,
    // A channel whose id is none is said as unknown, and was left out
    // of what was checked: not again as a post for no channel.
    violations: check.violations.filter(
      ({ _tag }) => _tag !== "noChannels" || read.malformedChannels.length === 0
    ),
  };

  return check.dropped.length === 0
    ? view
    : { ...view, warnings: droppedWarnings(check.dropped) };
};

/**
 * What clients see of a check, with the limit of the plan it found, if
 * any, told as PlanLimitReached tells it (`limitReached`).
 */
export const validationOf =
  (limitReached: LimitRefusal) =>
  (
    check: PostCheck,
    read: CheckInputRead
  ): Effect.Effect<PostValidation, never, CurrentMember> =>
    Option.match(check.planLimit, {
      onNone: () => Effect.succeed(Option.none<PlanShortfall>()),
      onSome: (reached) =>
        limitReached(reached).pipe(
          Effect.flip,
          Effect.map(
            ({ allowed, billingUrl, limit, plan, planWithRoom, used }) =>
              Option.some<PlanShortfall>({
                allowed,
                billingUrl,
                limit,
                plan,
                planWithRoom,
                used,
              })
          )
        ),
    }).pipe(Effect.map((shortfall) => validationView(check, read, shortfall)));
