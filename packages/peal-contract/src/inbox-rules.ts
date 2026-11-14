import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { CommentRuleEnded } from "./comment-rule-ended.ts";
import { CommentRuleNotFound } from "./comment-rule-not-found.ts";
import { CommentRuleNotPossible } from "./comment-rule-not-possible.ts";
import {
  commentRuleMatchesShown,
  CommentRuleChangeSchema,
  CommentRulePageSchema,
  CommentRuleSchema,
  CommentRuleStatusSchema,
  maxChannelRepliesPerDay,
  maxCommentRulesPerWorkspace,
  maxRuleRepliesPerDay,
  NewCommentRuleSchema,
} from "./comment-rule.ts";
import { Forbidden } from "./forbidden.ts";
import { TooManyCommentRules } from "./too-many-comment-rules.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

const workspace = { workspaceId: Schema.String };

const rule = { ...workspace, ruleId: Schema.String };

const answers = `A rule answers, by itself and in public, as the channel's account, a comment written after it started or was last set going again, under a post it answers on (a post's rule acts on the channels the post is for, scheduled or out), that holds one of its keywords as a word (whatever its case and accents): with its \`reply\`, once a comment and once a person, ${String(maxRuleRepliesPerDay)} replies a day at most, and ${String(maxChannelRepliesPerDay)} a day for every rule of a channel together, through the inbox's own replies (their journal, one reply a comment, each one of the billing account's outbound messages). It answers on Mastodon, and on Facebook Pages and Instagram where the server reads their comments; Bluesky's, X's, LinkedIn's and YouTube's rules forbid an app to answer by itself, and \`channels\` says so. It never likes, follows or messages anyone privately. It acts as whoever started it, with what they may do then: it ends when they can no longer answer comments, and when its channel is disconnected.`;

/** Rules that answer comments holding a keyword, by themselves. */
export class InboxRulesApi extends HttpApiGroup.make("inboxRules")
  .add(
    HttpApiEndpoint.get("listCommentRules", "/", {
      error: [Forbidden, HttpApiError.BadRequest],
      params: workspace,
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(Schema.isBetween({ maximum: 100, minimum: 1 }))
        ),
        status: Schema.optionalKey(CommentRuleStatusSchema),
      },
      success: CommentRulePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's comment rules, oldest first, 50 a page unless \`limit\` (at most 100) says otherwise, those with \`status\` alone when given, each with what its channels can carry and the latest ${String(commentRuleMatchesShown)} comments it matched. Needs engagement:read.`,
        summary: "List comment rules",
      })
    ),
    HttpApiEndpoint.post("createCommentRule", "/", {
      error: [
        Forbidden,
        CommentRuleNotPossible,
        HttpApiError.BadRequest,
        TooManyCommentRules,
      ],
      params: workspace,
      payload: NewCommentRuleSchema,
      success: CommentRuleSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Starts a rule on the comments of a post that went out (\`postId\`) or of every post of a channel (\`channelId\`), exactly one of them, with 1 to 10 \`keywords\` and a \`reply\`. ${answers} It is refused when no channel it answers on can carry its reply (CommentRuleNotPossible, with each channel's reason). A workspace keeps ${String(maxCommentRulesPerWorkspace)} rules active or paused. Needs engagement:reply; never staff acting as a member.`,
        summary: "Start a comment rule",
      })
    ),
    HttpApiEndpoint.get("getCommentRule", "/:ruleId", {
      error: [Forbidden, CommentRuleNotFound],
      params: rule,
      success: CommentRuleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers a comment rule of the workspace, what its channels can carry and what it matched. Needs engagement:read.",
        summary: "Get a comment rule",
      })
    ),
    HttpApiEndpoint.patch("updateCommentRule", "/:ruleId", {
      error: [
        Forbidden,
        CommentRuleEnded,
        CommentRuleNotFound,
        CommentRuleNotPossible,
      ],
      params: rule,
      payload: CommentRuleChangeSchema,
      success: CommentRuleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Changes a rule's keywords or reply, or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A paused rule looks at nothing, and answers no comment received while it was paused. An ended rule changes no more (CommentRuleEnded). Needs engagement:reply.",
        summary: "Update a comment rule",
      })
    ),
    HttpApiEndpoint.delete("deleteCommentRule", "/:ruleId", {
      error: [Forbidden, CommentRuleNotFound],
      params: rule,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Stops a rule: it answers nothing more; the replies it sent stay, and the inbox withdraws one as any other. Needs engagement:reply.",
        summary: "Stop a comment rule",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/inbox/rules") {}
