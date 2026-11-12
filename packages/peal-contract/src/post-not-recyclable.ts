import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/**
 * Why a post cannot repeat: it never went out and is not on its way
 * (`draft`, `awaitingApproval`, `cancelled`), another rule repeats it
 * (`repeating`), a rule made it (`occurrence`), or none of its channels is
 * connected any more (`noChannels`).
 */
export const NotRecyclableReasonSchema = Schema.Literals([
  "draft",
  "awaitingApproval",
  "cancelled",
  "repeating",
  "occurrence",
  "noChannels",
]).annotate({ identifier: "NotRecyclableReason" });

export type NotRecyclableReason = typeof NotRecyclableReasonSchema.Type;

/** The post cannot start a recycling rule. */
export class PostNotRecyclable extends Schema.TaggedError<PostNotRecyclable>()(
  "PostNotRecyclable",
  {
    ...errorEnvelope,
    postId: Schema.String,
    reason: NotRecyclableReasonSchema,
  },
  {
    description:
      "The post cannot repeat, for `reason`: it is a draft, waits for an approval or was cancelled; another rule repeats it already (stop that one first); a rule made it; or none of its channels is connected any more.",
    httpApiStatus: 409,
  }
) {}
