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
]).annotate({
  description: "A social network a channel connects to.",
  identifier: "Platform",
});

export type Platform = typeof PlatformSchema.Type;

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
