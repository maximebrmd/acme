import { Option, Schema } from "effect";

import type { Platform } from "./platform.ts";

/**
 * How an Instagram channel reaches its account, one of Meta's two APIs:
 *
 * - `instagramLogin`: the Instagram API with Instagram Login. The member
 *   signs in to the professional account itself, which needs no Facebook
 *   Page; Peal holds an Instagram user token that lasts 60 days and renews
 *   itself, and calls `graph.instagram.com`.
 * - `facebookLogin`: the Instagram API with Facebook Login. The member signs
 *   in to Facebook and picks among the professional accounts linked to the
 *   Pages they manage; Peal posts with the Page's token, which never
 *   expires, on `graph.facebook.com`.
 *
 * Every other platform has one way in, so its channels have none.
 */
export const InstagramConnectionSchema = Schema.Literals([
  "instagramLogin",
  "facebookLogin",
]);

export type InstagramConnection = typeof InstagramConnectionSchema.Type;

/**
 * The connection of a channel of the platform, from what was stored: an
 * Instagram channel stored without one was connected before Instagram Login
 * existed, through Facebook Login. Other platforms have none.
 */
export const connectionOf = (
  platform: Platform,
  stored: Option.Option<InstagramConnection>
): Option.Option<InstagramConnection> =>
  platform === "instagram"
    ? Option.some(Option.getOrElse(stored, () => "facebookLogin" as const))
    : Option.none();
