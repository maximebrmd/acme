import { Match, Schema } from "effect";

import type { Permission } from "#shared/domain/access.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";

/** The account a notice is about, as it was when the notice was made. */
export const NoticeChannelSchema = Schema.Struct({
  // The name people mention the account by, such as "@acme_example".
  handle: Schema.NonEmptyString,
  platform: PlatformSchema,
});

export type NoticeChannel = typeof NoticeChannelSchema.Type;

/** Why a post did not go out on a channel, as publishing records it. */
export const PostFailureReasonSchema = Schema.Literals([
  "contentRejected",
  "mediaRejected",
  "missed",
  "notPublished",
  "rateLimited",
  "tokenExpired",
  "unavailable",
]);

export type PostFailureReason = typeof PostFailureReasonSchema.Type;

// A post's channel is none when it was disconnected before the notice was
// made: the notice still says what happened to the post.
const postOn = {
  channel: Schema.Option(NoticeChannelSchema),
  postId: PostIdSchema,
};

/**
 * Something that happened in a workspace, which its members hear about. A
 * notice keeps it as data, never as sentences: each reader gets it in their
 * language, in the app and by email, when it reaches them.
 *
 * Notices are stored with it, so members and fields may be added but never
 * renamed or removed.
 */
export const NoticeEventSchema = Schema.Union([
  // The post went live on the channel.
  Schema.TaggedStruct("PostPublished", {
    ...postOn,
    permalink: Schema.Option(Schema.String),
  }),
  // The post did not go out on the channel.
  Schema.TaggedStruct("PostFailed", {
    ...postOn,
    reason: PostFailureReasonSchema,
  }),
  // Whether the post went live is not known: the reader checks the platform
  // before reposting it.
  Schema.TaggedStruct("PostUnconfirmed", postOn),
  // The channel's authorization stopped working: nothing is posted until it
  // is reconnected.
  Schema.TaggedStruct("ChannelReconnectRequired", {
    channel: NoticeChannelSchema,
  }),
  // The channel's authorization cannot be renewed and ends at `expiresAt`.
  Schema.TaggedStruct("ChannelReconnectSoon", {
    channel: NoticeChannelSchema,
    expiresAt: Schema.DateTimeUtc,
  }),
]);

export type NoticeEvent = typeof NoticeEventSchema.Type;

/** The kinds of notice a reader chooses to receive by email or not. */
export type EmailKind =
  | "channelReconnect"
  | "postFailed"
  | "postPublished"
  | "postUnconfirmed";

/** Which email preference covers the event. */
export const emailKindOf = (event: NoticeEvent): EmailKind =>
  Match.valueTags(event, {
    ChannelReconnectRequired: (): EmailKind => "channelReconnect",
    ChannelReconnectSoon: (): EmailKind => "channelReconnect",
    PostFailed: (): EmailKind => "postFailed",
    PostPublished: (): EmailKind => "postPublished",
    PostUnconfirmed: (): EmailKind => "postUnconfirmed",
  });

/**
 * Who hears about the event: the members able to act on it. Those who may
 * schedule posts can repost one, or confirm whether it went out; those who
 * may connect channels can reconnect one.
 */
export const audienceOf = (event: NoticeEvent): Permission =>
  Match.valueTags(event, {
    ChannelReconnectRequired: (): Permission => "channel:connect",
    ChannelReconnectSoon: (): Permission => "channel:connect",
    PostFailed: (): Permission => "post:schedule",
    PostPublished: (): Permission => "post:schedule",
    PostUnconfirmed: (): Permission => "post:schedule",
  });

/** The web app's page for the event, where the reader acts on it. */
export const pageOf = (event: NoticeEvent, workspaceId: WorkspaceId): string =>
  Match.valueTags(event, {
    ChannelReconnectRequired: () => `/app/${workspaceId}/channels`,
    ChannelReconnectSoon: () => `/app/${workspaceId}/channels`,
    PostFailed: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostPublished: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
    PostUnconfirmed: ({ postId }) => `/app/${workspaceId}/posts/${postId}`,
  });
