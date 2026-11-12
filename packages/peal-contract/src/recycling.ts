import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { CalendarDaySchema } from "./analytics.ts";
import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { PostNotFound } from "./post-not-found.ts";
import { PostNotRecyclable } from "./post-not-recyclable.ts";
import { maxPostTextLength } from "./post-text.ts";
import { PostOriginSchema, TextOverrideSchema } from "./posts.ts";
import { QueueNotFound } from "./queue-not-found.ts";
import { RecyclingEndsTooSoon } from "./recycling-ends-too-soon.ts";
import { RecyclingRuleEnded } from "./recycling-rule-ended.ts";
import { RecyclingRuleNotFound } from "./recycling-rule-not-found.ts";
import { RecyclingVariantsInvalid } from "./recycling-variants-invalid.ts";
import { TooManyRecyclingRules } from "./too-many-recycling-rules.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

// The limits below are the server's (src/publishing/domain/recycling-*.ts):
// a test keeps them equal.

/** The most rules a workspace keeps active or paused. */
export const maxRecyclingRulesPerWorkspace = 100;

/** The most posts a rule makes, its source counted; where one with no ending stops. */
export const maxOccurrences = 100;

/** The fewest posts a `count` asks for: the source and one more. */
export const minOccurrences = 2;

/** The most text variants a rule takes turns with. */
export const maxRecyclingVariants = 10;

/** The longest interval of each unit. */
export const maxRecyclingInterval = {
  days: 365,
  months: 12,
  weeks: 52,
} as const;

/** How many coming posts a rule lists. */
export const recyclingComingShown = 3;

/** How many rules a page holds, unless `limit` says otherwise. */
export const defaultRecyclingPageSize = 50;

/** The most rules a page holds. */
export const maxRecyclingPageSize = 100;

/** What an interval counts in. */
export const RecyclingUnitSchema = Schema.Literals([
  "days",
  "weeks",
  "months",
]).annotate({ identifier: "RecyclingUnit" });

export type RecyclingUnit = typeof RecyclingUnitSchema.Type;

/** How long a rule waits from one post to the next. */
export const RecyclingIntervalSchema = Schema.Struct({
  count: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)),
  unit: RecyclingUnitSchema,
})
  .check(
    Schema.makeFilter(
      ({
        count,
        unit,
      }: {
        readonly count: number;
        readonly unit: RecyclingUnit;
      }) => count <= maxRecyclingInterval[unit],
      { expected: "at most 365 days, 52 weeks or 12 months" }
    )
  )
  .annotate({ identifier: "RecyclingInterval" });

export type RecyclingInterval = typeof RecyclingIntervalSchema.Type;

const nul = String.fromCodePoint(0);

const VariantTextSchema = Schema.String.check(
  Schema.isMaxLength(maxPostTextLength),
  Schema.makeFilter((text: string) => !text.includes(nul), {
    expected: "text without NUL characters",
  })
);

/**
 * A text a post of the rule says instead of the source's: it replaces the
 * first part's text, and its texts by channel (none unless given); the
 * media, later parts and options stay the source's.
 */
export const RecyclingVariantSchema = Schema.Struct({
  overrides: Schema.optionalKey(Schema.Array(TextOverrideSchema)),
  text: VariantTextSchema,
}).annotate({ identifier: "RecyclingVariant" });

export type RecyclingVariant = typeof RecyclingVariantSchema.Type;

const VariantsSchema = Schema.Array(RecyclingVariantSchema).check(
  Schema.isMaxLength(maxRecyclingVariants)
);

/** Where a rule is. */
export const RecyclingStatusSchema = Schema.Literals([
  "active",
  "paused",
  "ended",
]).annotate({ identifier: "RecyclingStatus" });

export type RecyclingStatus = typeof RecyclingStatusSchema.Type;

/**
 * Why a rule ended: it made all it was asked for (`completed`), a member
 * stopped it (`stopped`), its source post is gone (`sourceGone`), whoever
 * started it can no longer schedule (`starterGone`), none of its channels
 * is left (`noChannels`), the platforms refuse what it would say
 * (`contentRejected`), the month has no room in the plan (`planLimit`),
 * its queue was deleted (`queueGone`) or has no free slot (`queueFull`).
 */
export const RecyclingEndReasonSchema = Schema.Literals([
  "completed",
  "stopped",
  "sourceGone",
  "starterGone",
  "noChannels",
  "contentRejected",
  "planLimit",
  "queueGone",
  "queueFull",
]).annotate({ identifier: "RecyclingEndReason" });

export type RecyclingEndReason = typeof RecyclingEndReasonSchema.Type;

/** A post a rule will make, and the variant it will say. */
export const RecyclingComingSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  // Its place among the rule's posts, the source being the first.
  occurrence: Schema.Int,
  // The variant's place, from 1; null for the source's own text.
  variant: Schema.NullOr(Schema.Int),
}).annotate({ identifier: "RecyclingComing" });

export type RecyclingComing = typeof RecyclingComingSchema.Type;

/** A rule that makes a post repeat. */
export const RecyclingRuleSchema = Schema.Struct({
  // The source's time, which every due instant is counted from.
  anchorAt: Schema.DateTimeUtc,
  // The next posts it will make, with the variant each says: computed.
  coming: Schema.Array(RecyclingComingSchema),
  // How many posts it makes in all, its source counted; null for none.
  count: Schema.NullOr(Schema.Int),
  createdAt: Schema.DateTimeUtc,
  // Why it ended; null unless it did.
  endedReason: Schema.NullOr(RecyclingEndReasonSchema),
  every: RecyclingIntervalSchema,
  id: Schema.String,
  // The time its latest post had: the next is made once it has passed.
  lastDueAt: Schema.DateTimeUtc,
  // The posts made, its source counted.
  made: Schema.Int,
  // When its next post goes out, or from when it takes the queue's first
  // free slot; null once it ended.
  nextDueAt: Schema.NullOr(Schema.DateTimeUtc),
  // The queue it places its posts on; null for the due instant itself.
  queueId: Schema.NullOr(Schema.String),
  sourcePostId: Schema.String,
  // The member who started it; null for a key, or once they left Peal.
  startedBy: Schema.NullOr(Schema.String),
  // How they reached Peal: its posts act as them, as they are then.
  startedVia: PostOriginSchema,
  status: RecyclingStatusSchema,
  // The IANA zone its wall-clock times are read in: the source's.
  timeZone: Schema.String,
  // The last day it makes a post on, in its zone; null for none.
  until: Schema.NullOr(CalendarDaySchema),
  variants: Schema.Array(
    Schema.Struct({
      overrides: Schema.Array(TextOverrideSchema),
      text: Schema.String,
    })
  ),
}).annotate({ identifier: "RecyclingRule" });

export type RecyclingRule = typeof RecyclingRuleSchema.Type;

/** A page of rules, oldest first. */
export const RecyclingRulePageSchema = Schema.Struct({
  items: Schema.Array(RecyclingRuleSchema),
  // Pass it as `cursor` for the next page; null on the last one.
  nextCursor: Schema.NullOr(Schema.String),
}).annotate({ identifier: "RecyclingRulePage" });

export type RecyclingRulePage = typeof RecyclingRulePageSchema.Type;

const CountSchema = Schema.Int.check(
  Schema.isBetween({ maximum: maxOccurrences, minimum: minOccurrences })
);

/** What starts a rule on a post. */
export const NewRecyclingRuleSchema = Schema.Struct({
  // How many posts it makes in all, the source counted: 2 to 100.
  count: Schema.optionalKey(CountSchema),
  every: RecyclingIntervalSchema,
  postId: Schema.String,
  // The queue it places its posts on, at its first free slot from each
  // due instant. Left out, each goes out at its due instant.
  queueId: Schema.optionalKey(Schema.String),
  // The last day it makes a post on, in the source's zone.
  until: Schema.optionalKey(CalendarDaySchema),
  variants: Schema.optionalKey(VariantsSchema),
}).annotate({ identifier: "NewRecyclingRule" });

export type NewRecyclingRule = typeof NewRecyclingRuleSchema.Type;

/** What changes of a rule: each left out stays as it is. */
export const RecyclingRuleChangeSchema = Schema.Struct({
  // A count, or null for none.
  count: Schema.optionalKey(Schema.NullOr(CountSchema)),
  // True pauses it; false sets a paused rule going again.
  paused: Schema.optionalKey(Schema.Boolean),
  // A day, or null for none.
  until: Schema.optionalKey(Schema.NullOr(CalendarDaySchema)),
  variants: Schema.optionalKey(VariantsSchema),
}).annotate({ identifier: "RecyclingRuleChange" });

export type RecyclingRuleChange = typeof RecyclingRuleChangeSchema.Type;

/** What a rule resumes with: other variants, if given. */
export const RecyclingResumeSchema = Schema.Struct({
  variants: Schema.optionalKey(VariantsSchema),
}).annotate({ identifier: "RecyclingResume" });

export type RecyclingResume = typeof RecyclingResumeSchema.Type;

const workspace = { workspaceId: Schema.String };

const rule = { ...workspace, ruleId: Schema.String };

const rules = `Each post a rule makes is a new post, copied from the source with what the workspace still has (its channels still connected, its media, the options on them, its tags; never a signature or a default added since), and sent as any post is: the same checks, the approval policy, the month's room in the plan, its own job, outcome and notices. It says the source's text, then each variant in turn, then the source's again. The next post is made once the latest one's time has passed, one interval after the one before at the same wall-clock time in the source's zone (a month shorter than the day takes its last day), or on the queue's first free slot from then; a time missed while nothing ran is skipped, never made up for. Each acts as whoever started the rule, with what they may do when it is made: a member removed, a key revoked or an application whose grant no longer publishes ends it.`;

/**
 * Rules that make a post repeat: a new post from a source post at an
 * interval, until a count or a date, with text variants taken in turn.
 */
export class RecyclingApi extends HttpApiGroup.make("recycling")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: [Forbidden, HttpApiError.BadRequest],
      params: workspace,
      query: {
        cursor: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxRecyclingPageSize, minimum: 1 })
          )
        ),
        status: Schema.optionalKey(RecyclingStatusSchema),
      },
      success: RecyclingRulePageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the workspace's recycling rules, oldest first, ${defaultRecyclingPageSize} a page unless \`limit\` (at most ${maxRecyclingPageSize}) says otherwise, those with \`status\` alone when given, each with its next ${recyclingComingShown} posts to come. Pass the page's \`nextCursor\` as \`cursor\` for the next one. Needs post:read.`,
        summary: "List recycling rules",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        PostNotFound,
        PostNotRecyclable,
        QueueNotFound,
        RecyclingEndsTooSoon,
        RecyclingVariantsInvalid,
        TooManyRecyclingRules,
      ],
      params: workspace,
      payload: NewRecyclingRuleSchema,
      success: RecyclingRuleSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Starts a rule that repeats a post that is scheduled, publishing or went out (deleted from a platform since or not): \`every\` 1 to ${maxRecyclingInterval.days} days, 1 to ${maxRecyclingInterval.weeks} weeks or 1 to ${maxRecyclingInterval.months} months, until \`count\` posts in all (${minOccurrences} to ${maxOccurrences}, the source counted) or until the day \`until\`, and never more than ${maxOccurrences}; with up to ${maxRecyclingVariants} text \`variants\`, each checked as the source saying it would be, and optionally on a queue. ${rules} A post has one rule going on at a time, and a workspace ${maxRecyclingRulesPerWorkspace} active or paused. It publishes again, in public, without anyone being asked each time, unless the approval policy holds the starter's posts: then each waits for an approval. Needs post:schedule, or post:create where posts wait for an approval; never staff acting as a member.`,
        summary: "Start repeating a post",
      })
    ),
    HttpApiEndpoint.get("get", "/:ruleId", {
      error: [Forbidden, RecyclingRuleNotFound],
      params: rule,
      success: RecyclingRuleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Answers with a rule of the workspace and its next ${recyclingComingShown} posts to come, each with the variant it will say. Needs post:read.`,
        summary: "Get a recycling rule",
      })
    ),
    HttpApiEndpoint.patch("update", "/:ruleId", {
      error: [
        Forbidden,
        PostNotFound,
        RecyclingEndsTooSoon,
        RecyclingRuleEnded,
        RecyclingRuleNotFound,
        RecyclingVariantsInvalid,
      ],
      params: rule,
      payload: RecyclingRuleChangeSchema,
      success: RecyclingRuleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Changes a rule's variants, its `count` or `until` (null takes it away), or pauses it (`paused` true) or sets it going again (false); what it leaves out stays. A post already made keeps what it says. An ended rule changes no more (RecyclingRuleEnded): resume it. Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.",
        summary: "Update a recycling rule",
      })
    ),
    HttpApiEndpoint.post("resume", "/:ruleId/resume", {
      error: [
        Forbidden,
        PostNotFound,
        RecyclingEndsTooSoon,
        RecyclingRuleEnded,
        RecyclingRuleNotFound,
        RecyclingVariantsInvalid,
      ],
      params: rule,
      payload: RecyclingResumeSchema,
      success: RecyclingRuleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Sets a paused rule going again, or one that ended for a reason that can be put right (`planLimit`, `contentRejected`, `noChannels`, `queueFull`), with other `variants` if given: its next post is due at the first due instant after now. Any other ended rule is RecyclingRuleEnded. Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.",
        summary: "Resume a recycling rule",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:ruleId", {
      error: [Forbidden, RecyclingRuleNotFound],
      params: rule,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Stops a rule: it makes no more posts and ends `stopped`; the posts it made stay as they are, scheduled ones included. Stopping an ended rule changes nothing. Needs post:schedule, or to be the rule's starter acting as they started it: in the web app, through the same application or with the same API key.",
        summary: "Stop a recycling rule",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/recycling") {}
