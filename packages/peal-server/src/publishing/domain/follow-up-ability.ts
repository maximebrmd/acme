import { Option, Schema } from "effect";

import {
  createsRecords,
  repostCollection,
} from "#shared/domain/bluesky-scopes.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { FollowUpBlockerSchema, followUpSupport } from "./follow-up-support.ts";
import { platformRules } from "./platform-rules.ts";
import { measureText } from "./text-length.ts";

/**
 * Why a channel cannot carry a kind of follow-up: the platform's
 * (`FollowUpBlocker`), the operator turned it off there (`turnedOff`: X's
 * replies with `X_THREADS`), the channel must be connected again for the
 * permission it takes (`reconnect`), Peal does not count the channel's
 * likes (`notCounted`), or the rule's comment is longer than the platform
 * takes (`textTooLong`). Answered by the API: add a member, never rename
 * or remove one.
 */
export const FollowUpUnavailableSchema = Schema.Union([
  FollowUpBlockerSchema,
  Schema.Literals(["turnedOff", "reconnect", "notCounted", "textTooLong"]),
]);

export type FollowUpUnavailable = typeof FollowUpUnavailableSchema.Type;

/**
 * A kind of follow-up on a channel: carried out, not asked by the rule,
 * or why it cannot be.
 */
export const FollowUpAbilitySchema = Schema.Union([
  Schema.Literals(["available", "notAsked"]),
  FollowUpUnavailableSchema,
]);

export type FollowUpAbility = typeof FollowUpAbilitySchema.Type;

/** What a channel can carry of a rule, kind by kind. */
export const ChannelFollowUpsSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  comment: FollowUpAbilitySchema,
  platform: PlatformSchema,
  repost: FollowUpAbilitySchema,
});

export type ChannelFollowUps = typeof ChannelFollowUpsSchema.Type;

/** Whether the channel carries some of what the rule asks. */
export const carriesSome = (channel: ChannelFollowUps): boolean =>
  channel.comment === "available" || channel.repost === "available";

/** What a channel is, as far as its follow-ups go. */
export interface FollowUpChannel {
  readonly channelId: ChannelId;
  readonly platform: Platform;
  /** Whether Peal counts the likes of its posts. */
  readonly counted: boolean;
  /** Whether the server sends a post's later parts on its platform. */
  readonly takesParts: boolean;
  /** Its account's OAuth scopes, when known. */
  readonly scopes: Option.Option<readonly string[]>;
}

/** What a rule asks: its comment, if one, and whether it reposts. */
export interface FollowUpAsk {
  readonly comment: Option.Option<string>;
  readonly repost: boolean;
}

/** The collection a Bluesky repost is a record of. */
export const blueskyRepostCollection = repostCollection;

const commentOn = (
  channel: FollowUpChannel,
  comment: Option.Option<string>
): FollowUpAbility => {
  if (Option.isNone(comment)) {
    return "notAsked";
  }

  const support = followUpSupport[channel.platform].comment;

  if (support !== "available") {
    return support;
  }

  if (!channel.takesParts) {
    return "turnedOff";
  }

  if (!channel.counted) {
    return "notCounted";
  }

  return textOverflowOf(channel.platform, comment.value)
    ? "textTooLong"
    : "available";
};

const repostOn = (
  channel: FollowUpChannel,
  repost: boolean
): FollowUpAbility => {
  if (!repost) {
    return "notAsked";
  }

  const support = followUpSupport[channel.platform].repost;

  if (support !== "available") {
    return support;
  }

  if (!channel.counted) {
    return "notCounted";
  }

  // Channels connected before Peal asked to repost there lack it.
  return channel.platform === "bluesky" &&
    Option.exists(
      channel.scopes,
      (scopes) => !createsRecords(scopes, [blueskyRepostCollection])
    )
    ? "reconnect"
    : "available";
};

/** What the channel can carry of what a rule asks, kind by kind. */
export const followUpsOn = (
  channel: FollowUpChannel,
  ask: FollowUpAsk
): ChannelFollowUps => ({
  channelId: channel.channelId,
  comment: commentOn(channel, ask.comment),
  platform: channel.platform,
  repost: repostOn(channel, ask.repost),
});

/** Whether the comment is longer than the platform takes. */
const textOverflowOf = (platform: Platform, text: string): boolean =>
  platformRules[platform].textLimits.some(
    (limit) => measureText(text, limit.unit) > limit.maximum
  );
