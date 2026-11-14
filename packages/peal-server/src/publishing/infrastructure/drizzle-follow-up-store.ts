import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { FollowUpStore } from "#publishing/application/follow-up-store.ts";
import type { ArmedFollowUp } from "#publishing/application/follow-up-store.ts";
import {
  FollowUpApprovalSchema,
  FollowUpRule,
} from "#publishing/domain/follow-up-rule.ts";
import type { FollowUpRuleStatus } from "#publishing/domain/follow-up-rule.ts";
import {
  FollowUp,
  FollowUpStatusSchema,
} from "#publishing/domain/follow-up.ts";
import type { FollowUpStatus } from "#publishing/domain/follow-up.ts";
import { PostOriginSchema } from "#publishing/domain/post-origin.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { followUpRules, followUps, postTargets } from "./schema.ts";

type RuleRow = typeof followUpRules.$inferSelect;

type FollowUpRow = typeof followUps.$inferSelect;

// Rows are decoded with the domain's schemas, so a row the domain could
// not have written fails loudly instead of being trusted.
const decodeRule = Schema.decodeUnknownEffect(FollowUpRule);

const decodeFollowUp = Schema.decodeUnknownEffect(FollowUp);

const ApprovalJson = Schema.toCodecJson(FollowUpApprovalSchema);
const StatusJson = Schema.toCodecJson(FollowUpStatusSchema);
const OriginJson = Schema.toCodecJson(PostOriginSchema);

const encodeApproval = Schema.encodeSync(ApprovalJson);
const decodeApproval = Schema.decodeUnknownEffect(ApprovalJson);
const encodeStatus = Schema.encodeSync(StatusJson);
const decodeStatus = Schema.decodeUnknownEffect(StatusJson);

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date) => DateTime.fromDateUnsafe(date);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const ruleStatusOf = (row: RuleRow) => {
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

const toRule = (row: RuleRow) =>
  Effect.gen(function* decodingRule() {
    const approval = yield* decodeApproval(row.approval);

    return yield* decodeRule({
      approval,
      comment: Option.fromNullOr(row.comment),
      createdAt: utc(row.createdAt),
      id: row.id,
      likes: row.likes,
      repost: row.repost,
      scope:
        row.scope === "post"
          ? { _tag: "post", postId: row.postId }
          : { _tag: "channel", channelId: row.channelId },
      startedBy: Option.fromNullOr(row.startedBy),
      startedVia: yield* Schema.decodeUnknownEffect(OriginJson)(row.startedVia),
      status: ruleStatusOf(row),
      workspaceId: row.workspaceId,
    });
  }).pipe(Effect.orDie);

const toFollowUp = (row: FollowUpRow) =>
  Effect.gen(function* decodingFollowUp() {
    const status = yield* decodeStatus(row.state);

    return yield* decodeFollowUp({
      armedAt: utc(row.armedAt),
      attempt: row.attempt,
      channelId: row.channelId,
      id: row.id,
      kind: row.kind,
      postId: row.postId,
      ruleId: row.ruleId,
      status,
      targetId: row.targetId,
      workspaceId: row.workspaceId,
    });
  }).pipe(Effect.orDie);

const firstOf =
  <Row, A>(toA: (row: Row) => Effect.Effect<A>) =>
  (rows: readonly Row[]) => {
    const [row] = rows;

    return row === undefined
      ? Effect.succeed(Option.none<A>())
      : toA(row).pipe(Effect.map(Option.some));
  };

const ruleStatusColumns = (status: FollowUpRuleStatus) => {
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

// What changes of a rule once it is started.
const changing = (rule: FollowUpRule) => ({
  ...ruleStatusColumns(rule.status),
  approval: encodeApproval(rule.approval),
  comment: Option.getOrNull(rule.comment),
  likes: rule.likes,
  repost: rule.repost,
  startedBy: Option.getOrNull(rule.startedBy),
});

// When its threshold was reached, for the channel's day: kept on every
// state that came after.
const triggeredAtOf = (status: FollowUpStatus) =>
  "triggeredAt" in status ? date(status.triggeredAt) : null;

const stateColumns = (followUp: FollowUp) => ({
  attempt: followUp.attempt,
  state: encodeStatus(followUp.status),
  status: followUp.status._tag,
  triggeredAt: triggeredAtOf(followUp.status),
  until: followUp.status._tag === "armed" ? date(followUp.status.until) : null,
});

const ruleInWorkspace = (workspaceId: string, ruleId: string) =>
  and(eq(followUpRules.workspaceId, workspaceId), eq(followUpRules.id, ruleId));

/** Follow-up rules and what they armed, in the publishing schema. */
export const DrizzleFollowUpStore = Layer.effect(
  FollowUpStore,
  Effect.gen(function* DrizzleFollowUpStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const rulesOf = Effect.forEach((row: RuleRow) => toRule(row));
    const followUpsOf = Effect.forEach((row: FollowUpRow) => toFollowUp(row));

    const openOf = (workspaceId: string, condition: ReturnType<typeof eq>) =>
      db
        .select()
        .from(followUpRules)
        .where(
          and(
            eq(followUpRules.workspaceId, workspaceId),
            condition,
            ne(followUpRules.status, "ended")
          )
        )
        .pipe(Effect.mapError(failed), Effect.flatMap(firstOf(toRule)));

    // The follow-ups in `status`, a page by id, each with its rule: those
    // waiting, only of rules that have not ended.
    const withRules = (
      status: "armed" | "waiting",
      after: Option.Option<FollowUp["id"]>,
      limit: number
    ) =>
      db
        .select()
        .from(followUps)
        .innerJoin(followUpRules, eq(followUpRules.id, followUps.ruleId))
        .where(
          and(
            eq(followUps.status, status),
            ...(status === "waiting"
              ? [ne(followUpRules.status, "ended")]
              : []),
            ...Option.toArray(
              after.pipe(Option.map((id) => gt(followUps.id, id)))
            )
          )
        )
        .orderBy(asc(followUps.id))
        .limit(limit)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(
            Effect.forEach((row) =>
              Effect.all({
                followUp: toFollowUp(row.follow_ups),
                rule: toRule(row.follow_up_rules),
              }).pipe(Effect.map((armed): ArmedFollowUp => armed))
            )
          )
        );

    return FollowUpStore.of({
      advance: (next, from) =>
        db
          .update(followUps)
          .set(stateColumns(next))
          .where(
            and(
              eq(followUps.id, from.id),
              eq(followUps.status, from.status._tag),
              sql`${followUps.state} = ${JSON.stringify(encodeStatus(from.status))}::jsonb`
            )
          )
          .returning({ id: followUps.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      arm: (armed) =>
        armed.length === 0
          ? Effect.succeed([])
          : db
              .insert(followUps)
              .values(
                armed.map((followUp) => ({
                  ...stateColumns(followUp),
                  armedAt: date(followUp.armedAt),
                  channelId: followUp.channelId,
                  id: followUp.id,
                  kind: followUp.kind,
                  postId: followUp.postId,
                  ruleId: followUp.ruleId,
                  targetId: followUp.targetId,
                  workspaceId: followUp.workspaceId,
                }))
              )
              .onConflictDoNothing({
                target: [followUps.targetId, followUps.kind],
                where: sql`${followUps.status} <> 'cancelled'`,
              })
              .returning()
              .pipe(Effect.mapError(failed), Effect.flatMap(followUpsOf)),
      armed: (after, limit) => withRules("armed", after, limit),
      waiting: (after, limit) => withRules("waiting", after, limit),
      armedOfRule: (ruleId) =>
        db
          .select()
          .from(followUps)
          .where(
            and(
              eq(followUps.ruleId, ruleId),
              inArray(followUps.status, ["armed", "waiting"])
            )
          )
          .orderBy(asc(followUps.id))
          .pipe(Effect.mapError(failed), Effect.flatMap(followUpsOf)),
      // A transaction's advisory lock, in the two-key form: the first key
      // names what is claimed, the second the workspace.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/follow-up-rules'), hashtext(${workspaceId}))`.pipe(
          Effect.asVoid,
          Effect.mapError(failed)
        ),
      claimChannelDay: (channelId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/follow-up-channel-day'), hashtext(${channelId}))`.pipe(
          Effect.asVoid,
          Effect.mapError(failed)
        ),
      claimCall: (followUpId, now) =>
        db
          .update(followUps)
          .set({ callClaimedAt: date(now) })
          .where(
            and(eq(followUps.id, followUpId), eq(followUps.status, "sending"))
          )
          .returning({ id: followUps.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      countOpen: (workspaceId) =>
        db
          .select({ open: count() })
          .from(followUpRules)
          .where(
            and(
              eq(followUpRules.workspaceId, workspaceId),
              ne(followUpRules.status, "ended")
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.open ?? 0)
          ),
      followUp: (followUpId) =>
        db
          .select()
          .from(followUps)
          .where(eq(followUps.id, followUpId))
          .pipe(Effect.mapError(failed), Effect.flatMap(firstOf(toFollowUp))),
      insertRule: (rule) =>
        db
          .insert(followUpRules)
          .values({
            ...changing(rule),
            channelId:
              rule.scope._tag === "channel" ? rule.scope.channelId : null,
            createdAt: date(rule.createdAt),
            id: rule.id,
            postId: rule.scope._tag === "post" ? rule.scope.postId : null,
            scope: rule.scope._tag,
            startedVia: Schema.encodeSync(OriginJson)(rule.startedVia),
            workspaceId: rule.workspaceId,
          })
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      listRules: (workspaceId, { after, limit, postId, status }) =>
        db
          .select()
          .from(followUpRules)
          .where(
            and(
              eq(followUpRules.workspaceId, workspaceId),
              ...Option.toArray(
                status.pipe(Option.map((tag) => eq(followUpRules.status, tag)))
              ),
              ...Option.toArray(
                postId.pipe(Option.map((id) => eq(followUpRules.postId, id)))
              ),
              ...Option.toArray(
                after.pipe(Option.map((id) => gt(followUpRules.id, id)))
              )
            )
          )
          .orderBy(asc(followUpRules.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(rulesOf)),
      lockRule: (workspaceId, ruleId) =>
        db
          .select()
          .from(followUpRules)
          .where(ruleInWorkspace(workspaceId, ruleId))
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(firstOf(toRule))),
      lockUnlessHeld: (followUpId) =>
        db
          .select()
          .from(followUps)
          .where(eq(followUps.id, followUpId))
          .for("update", { skipLocked: true })
          .pipe(Effect.mapError(failed), Effect.flatMap(firstOf(toFollowUp))),
      ofRule: (ruleId, limit) =>
        db
          .select()
          .from(followUps)
          .where(eq(followUps.ruleId, ruleId))
          .orderBy(desc(followUps.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(followUpsOf)),
      openOfChannel: (workspaceId, channelId) =>
        openOf(workspaceId, eq(followUpRules.channelId, channelId)),
      openOfPost: (workspaceId, postId) =>
        openOf(workspaceId, eq(followUpRules.postId, postId)),
      rule: (workspaceId, ruleId) =>
        db
          .select()
          .from(followUpRules)
          .where(ruleInWorkspace(workspaceId, ruleId))
          .pipe(Effect.mapError(failed), Effect.flatMap(firstOf(toRule))),
      openChannelRules: (after, limit) =>
        db
          .select()
          .from(followUpRules)
          .where(
            and(
              eq(followUpRules.scope, "channel"),
              ne(followUpRules.status, "ended"),
              ...Option.toArray(
                after.pipe(Option.map((id) => gt(followUpRules.id, id)))
              )
            )
          )
          .orderBy(asc(followUpRules.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(rulesOf)),
      settledPostRules: (limit) =>
        db
          .select()
          .from(followUpRules)
          .where(
            and(
              eq(followUpRules.scope, "post"),
              ne(followUpRules.status, "ended"),
              // Nothing of its post left to publish: cancelled, failed or
              // out everywhere, whether it armed anything or not.
              sql`NOT EXISTS (SELECT 1 FROM ${postTargets} WHERE ${postTargets.postId} = ${followUpRules.postId} AND ${postTargets.status} IN ('pending', 'publishing'))`,
              sql`NOT EXISTS (SELECT 1 FROM ${followUps} WHERE ${followUps.ruleId} = ${followUpRules.id} AND ${followUps.status} IN ('armed', 'sending', 'waiting'))`
            )
          )
          .orderBy(asc(followUpRules.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(rulesOf)),
      stranded: (triggeredBefore, callBefore, limit) =>
        db
          .select()
          .from(followUps)
          .where(
            and(
              eq(followUps.status, "sending"),
              lt(followUps.triggeredAt, date(triggeredBefore)),
              or(
                isNull(followUps.callClaimedAt),
                lt(followUps.callClaimedAt, date(callBefore))
              )
            )
          )
          .orderBy(asc(followUps.triggeredAt))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(followUpsOf)),
      triggeredSince: (channelId, since) =>
        db
          .select({ triggered: count() })
          .from(followUps)
          .where(
            and(
              eq(followUps.channelId, channelId),
              gte(followUps.triggeredAt, date(since)),
              inArray(followUps.status, [
                "sending",
                "sent",
                "failed",
                "unconfirmed",
              ])
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.triggered ?? 0)
          ),
      updateRule: (rule) =>
        db
          .update(followUpRules)
          .set(changing(rule))
          .where(ruleInWorkspace(rule.workspaceId, rule.id))
          .pipe(Effect.asVoid, Effect.mapError(failed)),
    });
  })
);
