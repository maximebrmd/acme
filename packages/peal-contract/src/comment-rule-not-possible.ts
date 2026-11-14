import { Schema } from "effect";

import {
  ChannelCommentRuleSchema,
  CommentRuleRefusalSchema,
} from "./comment-rule.ts";
import { errorEnvelope } from "./error-envelope.ts";

/** The comment rule cannot answer. */
export class CommentRuleNotPossible extends Schema.TaggedError<CommentRuleNotPossible>()(
  "CommentRuleNotPossible",
  {
    ...errorEnvelope,
    channels: Schema.Array(ChannelCommentRuleSchema),
    reason: CommentRuleRefusalSchema,
  },
  {
    description:
      "The rule cannot answer, for `reason`: its keywords are none, more than 10 or longer than 60 characters (`keywords`), its reply is empty (`emptyReply`), it answers on no channel of the inbox (`noChannel`: a post's rule needs a post that went out), or (`channels`) no channel can carry its reply, or it is too long for one that could: `channels` says, for each channel, why not. Nothing was started or changed.",
    httpApiStatus: 422,
  }
) {}
