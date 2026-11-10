import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The post cannot be boosted there. */
export class PostNotPromotable extends Schema.TaggedError<PostNotPromotable>()(
  "PostNotPromotable",
  {
    ...errorEnvelope,
    reason: Schema.Literals(["notPublished", "platform", "connection"]),
  },
  {
    description:
      "The post cannot be boosted there. `notPublished`: it is not published on that channel, or the channel was disconnected since. `platform`: Peal boosts posts on Facebook Pages and Instagram only. `connection`: the Instagram account was connected through Instagram Login, which cannot run ads: connect it through its Facebook Page.",
    httpApiStatus: 422,
  }
) {}
