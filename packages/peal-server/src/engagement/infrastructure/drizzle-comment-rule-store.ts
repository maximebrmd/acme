import { and, asc, count, desc, eq, gt, gte, ne } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { CommentRuleStore } from "#engagement/application/ports/comment-rule-store.ts";
import type {
  MatchOutcome,
  RuleMatch,
} from "#engagement/application/ports/comment-rule-store.ts";
import { CommentIdSchema } from "#engagement/domain/comment-id.ts";
import {
  CommentRule,
  CommentRuleOriginSchema,
} from "#engagement/domain/comment-rule.ts";
import type { CommentRuleStatus } from "#engagement/domain/comment-rule.ts";
import { ReplyIdSchema } from "#engagement/domain/reply-id.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { commentRuleMatches, commentRules, threads } from "./schema.ts";

type Row = typeof commentRules.$inferSelect;

const decodeRule = Schema.decodeUnknownEffect(CommentRule);
const OriginJson = Schema.toCodecJson(CommentRuleOriginSchema);
const decodeOrigin = Schema.decodeUnknownEffect(OriginJson);
const encodeOrigin = Schema.encodeSync(OriginJson);

const decodeCandidates = Schema.decodeUnknownEffect(
  Schema.Array(
    Schema.Struct({
      authorPlatformId: Schema.NullOr(Schema.String),
      channelId: ChannelIdSchema,
      commentId: CommentIdSchema,
      text: Schema.String,
    })
  )
);

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date) => DateTime.fromDateUnsafe(date);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const statusOf = (row: Row) => {
  if (row.status === "paused") {
    return { _tag: "paused", pausedAt: row.statusAt && utc(row.statusAt) };
  }

  if (row.status === "ended") {
    return {
      _tag: "ended",
      endedAt: row.statusAt && utc(row.statusAt),
      reason: row.endedReason,
    };
  }

  return { _tag: row.status };
};

const toRule = (row: Row) =>
  Effect.gen(function* decodingRule() {
    return yield* decodeRule({
      createdAt: utc(row.createdAt),
      id: row.id,
      keywords: row.keywords,
      reply: row.reply,
      scope:
        row.scope === "post"
          ? { _tag: "post", postId: row.postId }
          : { _tag: "channel", channelId: row.channelId },
      startedBy: Option.fromNullOr(row.startedBy),
      startedVia: yield* decodeOrigin(row.startedVia),
      status: statusOf(row),
      workspaceId: row.workspaceId,
    });
  }).pipe(Effect.orDie);

const rulesOf = Effect.forEach((row: Row) => toRule(row));

const firstRule = (rows: readonly Row[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<CommentRule>())
    : toRule(row).pipe(Effect.map(Option.some));
};

const statusColumns = (status: CommentRuleStatus) => {
  if (status._tag === "paused") {
    return {
      endedReason: null,
      status: status._tag,
      statusAt: date(status.pausedAt),
    };
  }

  if (status._tag === "ended") {
    return {
      endedReason: status.reason,
      status: status._tag,
      statusAt: date(status.endedAt),
    };
  }

  return { endedReason: null, status: status._tag, statusAt: null };
};

const changing = (rule: CommentRule) => ({
  ...statusColumns(rule.status),
  keywords: [...rule.keywords],
  reply: rule.reply,
  startedBy: Option.getOrNull(rule.startedBy),
});

const inWorkspace = (workspaceId: string, ruleId: string) =>
  and(eq(commentRules.workspaceId, workspaceId), eq(commentRules.id, ruleId));

const outcomeColumns = (outcome: MatchOutcome) => ({
  code: outcome._tag === "refused" ? outcome.code : null,
  outcome: outcome._tag,
  replyId: outcome._tag === "replied" ? outcome.replyId : null,
});

const matchOf = (row: typeof commentRuleMatches.$inferSelect): RuleMatch => {
  const commentId = CommentIdSchema.make(row.commentId);
  const lookedAt = utc(row.lookedAt);

  switch (row.outcome) {
    case "replied": {
      return {
        commentId,
        lookedAt,
        outcome: {
          _tag: "replied",
          replyId: ReplyIdSchema.make(row.replyId ?? ""),
        },
      };
    }

    case "refused": {
      return {
        commentId,
        lookedAt,
        outcome: { _tag: "refused", code: row.code ?? "" },
      };
    }

    case "samePerson": {
      return { commentId, lookedAt, outcome: { _tag: "samePerson" } };
    }

    case "noMatch": {
      return { commentId, lookedAt, outcome: { _tag: "noMatch" } };
    }

    default: {
      return { commentId, lookedAt, outcome: { _tag: "claimed" } };
    }
  }
};

/** Comment rules and what they looked at, in the engagement schema. */
export const DrizzleCommentRuleStore = Layer.effect(
  CommentRuleStore,
  Effect.gen(function* DrizzleCommentRuleStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return CommentRuleStore.of({
      active: (after, limit) =>
        db
          .select()
          .from(commentRules)
          .where(
            and(
              eq(commentRules.status, "active"),
              ...Option.toArray(
                after.pipe(Option.map((id) => gt(commentRules.id, id)))
              )
            )
          )
          .orderBy(asc(commentRules.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(rulesOf)),
      answeredAuthor: (ruleId, authorPlatformId, commentId) =>
        client`
          SELECT 1 FROM engagement.comment_rule_matches m
          JOIN engagement.comments c ON c.id = m.comment_id
          WHERE m.rule_id = ${ruleId}
            AND m.outcome IN ('replied', 'claimed')
            AND m.comment_id <> ${commentId}
            AND c.author_platform_id = ${authorPlatformId}
          LIMIT 1
        `.pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.mapError(failed)
        ),
      candidates: (rule, limit) =>
        client`
          SELECT c.id AS "commentId", c.channel_id AS "channelId",
            c.author_platform_id AS "authorPlatformId", c.text
          FROM engagement.comments c
          JOIN engagement.threads t ON t.id = c.thread_id
          WHERE c.workspace_id = ${rule.workspaceId}
            AND ${
              rule.scope._tag === "post"
                ? client`t.post_id = ${rule.scope.postId}`
                : client`t.channel_id = ${rule.scope.channelId}`
            }
            AND c.state = 'new'
            AND c.received_at >= ${date(rule.createdAt)}
            AND NOT EXISTS (
              SELECT 1 FROM engagement.comment_rule_matches m
              WHERE m.rule_id = ${rule.id} AND m.comment_id = c.id
            )
          ORDER BY c.received_at, c.id
          LIMIT ${limit}
        `.pipe(
          Effect.flatMap(decodeCandidates),
          Effect.map((rows) =>
            rows.map((row) => ({
              ...row,
              authorPlatformId: Option.fromNullOr(row.authorPlatformId),
            }))
          ),
          Effect.mapError(failed)
        ),
      channelsOfPost: (workspaceId, postId) =>
        db
          .selectDistinct({ channelId: threads.channelId })
          .from(threads)
          .where(
            and(
              eq(threads.workspaceId, workspaceId),
              eq(threads.postId, postId)
            )
          )
          .orderBy(asc(threads.channelId))
          .pipe(
            Effect.map((rows) =>
              rows.map(({ channelId }) => ChannelIdSchema.make(channelId))
            ),
            Effect.mapError(failed)
          ),
      // A transaction's advisory lock, in the two-key form.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/engagement/comment-rules'), hashtext(${workspaceId}))`.pipe(
          Effect.asVoid,
          Effect.mapError(failed)
        ),
      claimMatch: (ruleId, commentId, now) =>
        db
          .insert(commentRuleMatches)
          .values({
            commentId,
            lookedAt: date(now),
            outcome: "claimed",
            ruleId,
          })
          .onConflictDoNothing()
          .returning({ commentId: commentRuleMatches.commentId })
          .pipe(
            Effect.map((rows) => rows.length > 0),
            Effect.mapError(failed)
          ),
      countOpen: (workspaceId) =>
        db
          .select({ open: count() })
          .from(commentRules)
          .where(
            and(
              eq(commentRules.workspaceId, workspaceId),
              ne(commentRules.status, "ended")
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.open ?? 0)
          ),
      insert: (rule) =>
        db
          .insert(commentRules)
          .values({
            ...changing(rule),
            channelId:
              rule.scope._tag === "channel" ? rule.scope.channelId : null,
            createdAt: date(rule.createdAt),
            id: rule.id,
            postId: rule.scope._tag === "post" ? rule.scope.postId : null,
            scope: rule.scope._tag,
            startedVia: encodeOrigin(rule.startedVia),
            workspaceId: rule.workspaceId,
          })
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      list: (workspaceId, { after, limit, status }) =>
        db
          .select()
          .from(commentRules)
          .where(
            and(
              eq(commentRules.workspaceId, workspaceId),
              ...Option.toArray(
                status.pipe(Option.map((tag) => eq(commentRules.status, tag)))
              ),
              ...Option.toArray(
                after.pipe(Option.map((id) => gt(commentRules.id, id)))
              )
            )
          )
          .orderBy(asc(commentRules.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(rulesOf)),
      lock: (workspaceId, ruleId) =>
        db
          .select()
          .from(commentRules)
          .where(inWorkspace(workspaceId, ruleId))
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(firstRule)),
      matchesOf: (ruleId, limit) =>
        db
          .select()
          .from(commentRuleMatches)
          .where(
            and(
              eq(commentRuleMatches.ruleId, ruleId),
              ne(commentRuleMatches.outcome, "noMatch")
            )
          )
          .orderBy(desc(commentRuleMatches.lookedAt))
          .limit(limit)
          .pipe(
            Effect.map((rows) => rows.map(matchOf)),
            Effect.mapError(failed)
          ),
      releaseMatch: (ruleId, commentId) =>
        db
          .delete(commentRuleMatches)
          .where(
            and(
              eq(commentRuleMatches.ruleId, ruleId),
              eq(commentRuleMatches.commentId, commentId),
              eq(commentRuleMatches.outcome, "claimed")
            )
          )
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      repliedSince: (ruleId, since) =>
        db
          .select({ replied: count() })
          .from(commentRuleMatches)
          .where(
            and(
              eq(commentRuleMatches.ruleId, ruleId),
              eq(commentRuleMatches.outcome, "replied"),
              gte(commentRuleMatches.lookedAt, date(since))
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.replied ?? 0)
          ),
      rule: (workspaceId, ruleId) =>
        db
          .select()
          .from(commentRules)
          .where(inWorkspace(workspaceId, ruleId))
          .pipe(Effect.mapError(failed), Effect.flatMap(firstRule)),
      settleMatch: (ruleId, commentId, outcome) =>
        db
          .update(commentRuleMatches)
          .set(outcomeColumns(outcome))
          .where(
            and(
              eq(commentRuleMatches.ruleId, ruleId),
              eq(commentRuleMatches.commentId, commentId)
            )
          )
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      update: (rule) =>
        db
          .update(commentRules)
          .set(changing(rule))
          .where(inWorkspace(rule.workspaceId, rule.id))
          .pipe(Effect.asVoid, Effect.mapError(failed)),
    });
  })
);
