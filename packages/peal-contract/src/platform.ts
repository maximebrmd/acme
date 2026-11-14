import { Schema } from "effect";

/**
 * The social networks a channel can connect to. The server's list
 * (src/channels/domain/platform.ts) is the source; a test keeps the two equal.
 */
export const PlatformSchema = Schema.Literals([
  "x",
  "linkedin",
  "bluesky",
  "mastodon",
  "threads",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "pinterest",
  "googleBusiness",
]).annotate({
  description: "A social network a channel connects to.",
  identifier: "Platform",
});

export type Platform = typeof PlatformSchema.Type;

/**
 * The websites a channel can publish articles to: `wordpress`, a WordPress
 * site of its own, reached with an application password. The server's
 * list (src/shared/domain/platform.ts) is the source; a test keeps the two
 * equal.
 */
// One kind so far: a single literal, which the document writes as a plain
// enum (a list of one would be an anyOf of one). Hosted WordPress, Dev.to
// and Hashnode join it as `Schema.Literals`.
export const SitePlatformSchema = Schema.Literal("wordpress").annotate({
  description: "A kind of website a channel publishes articles to.",
  identifier: "SitePlatform",
});

export type SitePlatform = typeof SitePlatformSchema.Type;

/**
 * What a channel connects to: a social network, whose channels take posts,
 * or a website, whose channels take articles.
 */
export const ChannelPlatformSchema = Schema.Literals([
  ...PlatformSchema.literals,
  SitePlatformSchema.literal,
]).annotate({
  description:
    "What a channel connects to: a social network (posts) or a website (articles).",
  identifier: "ChannelPlatform",
});

export type ChannelPlatform = typeof ChannelPlatformSchema.Type;

/**
 * How an Instagram channel reaches its account, one of Meta's two APIs:
 * `instagramLogin` (the member signs in to the professional account on
 * Instagram; no Facebook Page needed) or `facebookLogin` (the member signs
 * in to Facebook and picks among the professional accounts linked to the
 * Pages they manage). The server's copy
 * (src/shared/domain/instagram-connection.ts) is the source; a test keeps
 * the two equal.
 */
export const InstagramConnectionSchema = Schema.Literals([
  "instagramLogin",
  "facebookLogin",
]).annotate({
  description: "How an Instagram channel reaches its account.",
  identifier: "InstagramConnection",
});

export type InstagramConnection = typeof InstagramConnectionSchema.Type;

/**
 * What a LinkedIn channel posts as: `linkedinProfile` (a member's own
 * profile) or `linkedinPage` (a company page the member administers, which
 * needs a server whose operator LinkedIn granted the Community Management
 * API). The server's copy (src/shared/domain/linkedin-connection.ts) is the
 * source; a test keeps the two equal.
 */
export const LinkedInConnectionSchema = Schema.Literals([
  "linkedinProfile",
  "linkedinPage",
]).annotate({
  description: "What a LinkedIn channel posts as: a profile or a page.",
  identifier: "LinkedInConnection",
});

export type LinkedInConnection = typeof LinkedInConnectionSchema.Type;

/**
 * The way in a channel came through, on the platforms that have several:
 * Instagram's and LinkedIn's.
 */
export const ChannelConnectionSchema = Schema.Literals([
  ...InstagramConnectionSchema.literals,
  ...LinkedInConnectionSchema.literals,
]).annotate({
  description:
    "The way in a channel came through, on platforms that have several.",
  identifier: "ChannelConnection",
});

export type ChannelConnection = typeof ChannelConnectionSchema.Type;
