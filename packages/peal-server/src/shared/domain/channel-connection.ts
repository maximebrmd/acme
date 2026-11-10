import { Option, Schema } from "effect";

import { InstagramConnectionSchema } from "./instagram-connection.ts";
import { LinkedInConnectionSchema } from "./linkedin-connection.ts";
import type { Platform } from "./platform.ts";

/**
 * The way in a channel came through, on the platforms that have several:
 * Instagram's two logins, and LinkedIn's profile or page. Its tokens are
 * renewed, and its posts sent, the same way. Every other platform has one
 * way in, so its channels have none.
 */
export const ChannelConnectionSchema = Schema.Literals([
  ...InstagramConnectionSchema.literals,
  ...LinkedInConnectionSchema.literals,
]);

export type ChannelConnection = typeof ChannelConnectionSchema.Type;

// What a channel stored without a connection came through: Facebook Login
// for Instagram, before Instagram Login existed, and the member's profile
// for LinkedIn, before pages did.
const first: Partial<Record<Platform, ChannelConnection>> = {
  instagram: "facebookLogin",
  linkedin: "linkedinProfile",
};

/**
 * The connection of a channel of the platform, from what was stored: one
 * stored without any on a platform that now has several came the first way
 * there was. Other platforms have none.
 */
export const connectionOf = (
  platform: Platform,
  stored: Option.Option<ChannelConnection>
): Option.Option<ChannelConnection> =>
  Option.fromUndefinedOr(first[platform]).pipe(
    Option.map((initial) => Option.getOrElse(stored, () => initial))
  );

/** The platforms whose channels name the way in they came through. */
export const hasConnections = (platform: Platform): boolean =>
  first[platform] !== undefined;

/** Whether the connection is one of the platform's ways in. */
export const isConnectionOf = (
  platform: Platform,
  connection: ChannelConnection
): boolean =>
  (platform === "instagram" &&
    Schema.is(InstagramConnectionSchema)(connection)) ||
  (platform === "linkedin" && Schema.is(LinkedInConnectionSchema)(connection));
