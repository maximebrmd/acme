import { Duration, Option, Schema } from "effect";

import type { ChannelOnPlatform } from "./content-rules.ts";
import type { ContentViolation } from "./content-violation.ts";
import type { MediaFile } from "./media-file.ts";
import type { TargetOptions } from "./target-options.ts";
import { TikTokOptions, TikTokPrivacyLevelSchema } from "./tiktok-options.ts";
import type { TikTokField } from "./tiktok-options.ts";

/**
 * A TikTok creator's posting settings, as TikTok's creator info gives them
 * when a post is about to be made: who the post goes out as, the audiences
 * the account offers (a public account: everyone, friends, only me; a
 * private one: followers, friends, only me), the interactions the creator
 * turned off in their settings, and the longest video they may post.
 */
export class TikTokCreator extends Schema.Class<TikTokCreator>(
  "acme-server/publishing/domain/TikTokCreator"
)({
  avatarUrl: Schema.Option(Schema.String),
  commentDisabled: Schema.Boolean,
  // Off for private accounts too. Photo posts have no Duets nor Stitches.
  duetDisabled: Schema.Boolean,
  maxVideoDuration: Schema.Option(Schema.Duration),
  nickname: Schema.String,
  privacyLevels: Schema.Array(TikTokPrivacyLevelSchema),
  stitchDisabled: Schema.Boolean,
  username: Schema.String,
}) {}

/**
 * Why a creator cannot post now, as creator info says: the posts TikTok
 * allows them a day are spent (about 15, shared by every app), they are
 * banned from posting, or Acme's app reached its daily count of creators
 * who post through it.
 */
export const TikTokBlockSchema = Schema.Literals([
  "postLimit",
  "banned",
  "clientLimit",
]);

export type TikTokBlock = typeof TikTokBlockSchema.Type;

/** Whether a creator can post now, and with which settings. */
export type TikTokPosting =
  | { readonly _tag: "ready"; readonly creator: TikTokCreator }
  | { readonly _tag: "blocked"; readonly reason: TikTokBlock };

const isTikTok = Schema.is(TikTokOptions);

const invalid = (
  channel: ChannelOnPlatform,
  field: TikTokField
): ContentViolation => ({ _tag: "optionInvalid", ...channel, field });

// An interaction the options allow, which the creator turned off.
const allowedAgainst = (allowedHere: boolean | undefined, turnedOff: boolean) =>
  allowedHere === false && turnedOff;

/**
 * What the creator's settings forbid in a post on their channel, beyond
 * TikTok's own rules: an audience the account does not offer, an
 * interaction the creator turned off (Duets and Stitches on videos only),
 * a video longer than they may post. A target without TikTok's options has
 * nothing to check here: its missing options are reported elsewhere.
 */
export const creatorViolationsOn = (
  channel: ChannelOnPlatform,
  creator: TikTokCreator,
  options: Option.Option<TargetOptions>,
  files: readonly MediaFile[]
): readonly ContentViolation[] => {
  const chosen = options.pipe(Option.filter(isTikTok));

  if (Option.isNone(chosen)) {
    return [];
  }

  const { disableComment, disableDuet, disableStitch, privacyLevel } =
    chosen.value;

  const videos = files.filter((file) => file.kind === "video");

  const tooLong = Option.match(creator.maxVideoDuration, {
    onNone: () => [],
    onSome: (maximum) =>
      videos.flatMap((video): readonly ContentViolation[] =>
        Option.match(video.duration, {
          onNone: () => [],
          onSome: (duration) => {
            const durationMs = Math.round(Duration.toMillis(duration));
            const maximumMs = Math.round(Duration.toMillis(maximum));

            return durationMs > maximumMs
              ? [
                  {
                    _tag: "videoTooLong",
                    ...channel,
                    durationMs,
                    maximumMs,
                    mediaId: video.mediaId,
                  },
                ]
              : [];
          },
        })
      ),
  });

  return [
    ...(privacyLevel !== undefined &&
    !creator.privacyLevels.includes(privacyLevel)
      ? [invalid(channel, "privacyLevel")]
      : []),
    ...(allowedAgainst(disableComment, creator.commentDisabled)
      ? [invalid(channel, "disableComment")]
      : []),
    ...(videos.length > 0 && allowedAgainst(disableDuet, creator.duetDisabled)
      ? [invalid(channel, "disableDuet")]
      : []),
    ...(videos.length > 0 &&
    allowedAgainst(disableStitch, creator.stitchDisabled)
      ? [invalid(channel, "disableStitch")]
      : []),
    ...tooLong,
  ];
};
