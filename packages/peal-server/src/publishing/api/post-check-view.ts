import { Option } from "effect";
import type {
  ChannelPreview as PreviewView,
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

import type { CheckInputRead } from "./post-check-input.ts";

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
export const validationView = (
  check: PostCheck,
  read: CheckInputRead,
  shortfall: Option.Option<PlanShortfall>
): PostValidation => {
  const schedule = read.zoneKnown
    ? Option.getOrNull(check.schedule)
    : "invalidTimeZone";

  return {
    channels: check.channels.map(previewView),
    planLimit: Option.getOrNull(shortfall),
    schedule,
    unknownChannels: [...read.malformedChannels, ...check.unknownChannels],
    unknownMedia: [...read.malformedMedia, ...check.unknownMedia],
    valid:
      isSendable(check) &&
      read.zoneKnown &&
      read.malformedChannels.length === 0 &&
      read.malformedMedia.length === 0,
    violations: [...check.violations],
  };
};
