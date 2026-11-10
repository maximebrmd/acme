import { Schema } from "effect";

/**
 * The post cannot be boosted:
 *
 * - `notPublished`: it is not published on that channel, or the channel
 *   was disconnected since.
 * - `platform`: its platform is not one Peal boosts on.
 * - `connection`: the Instagram account was connected through Instagram
 *   Login, which cannot run ads: it is connected through its Page.
 */
export class PostNotPromotable extends Schema.TaggedError<PostNotPromotable>()(
  "PostNotPromotable",
  { reason: Schema.Literals(["notPublished", "platform", "connection"]) }
) {}
