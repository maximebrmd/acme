import { Schema } from "effect";

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
 */
export const InstagramConnectionSchema = Schema.Literals([
  "instagramLogin",
  "facebookLogin",
]);

export type InstagramConnection = typeof InstagramConnectionSchema.Type;
