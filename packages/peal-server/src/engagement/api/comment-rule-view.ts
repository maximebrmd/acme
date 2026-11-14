import { Option } from "effect";
import type { CommentRule as CommentRuleView } from "peal-contract";

import type { ListedCommentRule } from "#engagement/application/comment-rules.ts";
import type { RuleMatch } from "#engagement/application/ports/comment-rule-store.ts";

const matchView = ({ commentId, lookedAt, outcome }: RuleMatch) => ({
  code: outcome._tag === "refused" ? outcome.code : null,
  commentId,
  lookedAt,
  // What matched nothing is never listed: the store leaves it out.
  outcome: outcome._tag === "noMatch" ? ("claimed" as const) : outcome._tag,
  replyId: outcome._tag === "replied" ? outcome.replyId : null,
});

/** What clients see of a comment rule, its channels and what it did. */
export const commentRuleView = ({
  channels,
  matches,
  rule,
}: ListedCommentRule): CommentRuleView => ({
  channelId: rule.scope._tag === "channel" ? rule.scope.channelId : null,
  channels: channels.map(({ channelId, platform, reply }) => ({
    channelId,
    platform,
    reply,
  })),
  createdAt: rule.createdAt,
  endedReason: rule.status._tag === "ended" ? rule.status.reason : null,
  id: rule.id,
  keywords: rule.keywords,
  matches: matches.map(matchView),
  postId: rule.scope._tag === "post" ? rule.scope.postId : null,
  reply: rule.reply,
  startedBy: Option.getOrNull(rule.startedBy),
  status: rule.status._tag,
});
