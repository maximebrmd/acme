import { Option } from "effect";

import { connectionOf } from "#shared/domain/channel-connection.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import {
  facebookCommentScopes,
  instagramLoginCommentScope,
  instagramPageCommentScope,
  linkedinCommentScopes,
  youtubeCommentScope,
} from "#shared/domain/inbox-platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import type { AccountRestriction } from "./account-restriction.ts";
import type { ChannelOnPlatform } from "./content-rules.ts";
import type { ContentViolation } from "./content-violation.ts";
import { followUpsOn } from "./platform-rules.ts";

// The scopes a comment takes, by platform, from the channel's way in.
const commentScopes: Readonly<
  Partial<
    Record<
      Platform,
      (connection: Option.Option<ChannelConnection>) => readonly string[]
    >
  >
> = {
  facebook: () => [facebookCommentScopes.manage],
  instagram: (connection) =>
    Option.contains(connection, "instagramLogin")
      ? [instagramLoginCommentScope]
      : [instagramPageCommentScope],
  linkedin: () => [linkedinCommentScopes.write],
  youtube: () => [youtubeCommentScope],
};

/**
 * The scopes that let Peal comment as the account under its own post, by
 * platform and way in: the ones the inbox answers a comment with
 * (`#shared/domain/inbox-platform.ts`), which the sign-ins ask for where
 * the server reads that platform's comments. LinkedIn's Comments API page
 * names `w_organization_social_feed` for a comment as a page; its Posts
 * page says `w_organization_social` covers comments too, which Peal does
 * not rely on until it is confirmed. None on a platform whose parts are
 * no comments.
 */
export const commentScopesOn = (
  platform: Platform,
  connection: Option.Option<ChannelConnection>
): readonly string[] =>
  followUpsOn(platform)?.kind === "comment"
    ? (commentScopes[platform]?.(connectionOf(platform, connection)) ?? [])
    : [];

// Whether the scopes let the channel comment, on a platform of comments.
const ungranted = (
  platform: Platform,
  connection: Option.Option<ChannelConnection>,
  scopes: readonly string[]
): boolean => {
  const needed = commentScopesOn(platform, connection);

  return needed.length > 0 && !needed.some((scope) => scopes.includes(scope));
};

/**
 * What a channel whose account did not grant the comment scope narrows,
 * said beforehand: a first comment needs the channel to be connected
 * again, as one connected before the server read the platform's comments
 * has not granted it.
 */
export const commentRestrictions = (
  platform: Platform,
  connection: Option.Option<ChannelConnection>,
  scopes: readonly string[]
): readonly AccountRestriction[] =>
  ungranted(platform, connection, scopes)
    ? [{ _tag: "partsNeedReconnect" }]
    : [];

/**
 * What scheduling refuses on such a channel when the post has a first
 * comment: the comment, until the channel is connected again.
 */
export const commentViolationsOn = (
  channel: ChannelOnPlatform,
  followUps: number,
  scopes: readonly string[]
): readonly ContentViolation[] =>
  followUps > 0 &&
  ungranted(
    channel.platform,
    Option.fromUndefinedOr(channel.connection),
    scopes
  )
    ? [
        {
          _tag: "partsNeedReconnect",
          channelId: channel.channelId,
          part: 1,
          platform: channel.platform,
        },
      ]
    : [];
