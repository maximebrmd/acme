import { and, asc, count, eq, gt, lt, lte, ne, or } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { RecyclingStore } from "#publishing/application/recycling-store.ts";
import { PostOriginSchema } from "#publishing/domain/post-origin.ts";
import { RecyclingIntervalSchema } from "#publishing/domain/recycling-interval.ts";
import {
  RecyclingRule,
  RecyclingVariantsSchema,
} from "#publishing/domain/recycling-rule.ts";
import type { RecyclingStatus } from "#publishing/domain/recycling-rule.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { recyclingRules } from "./schema.ts";

type Row = typeof recyclingRules.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeRule = Schema.decodeUnknownEffect(RecyclingRule);

const encodeVariants = Schema.encodeSync(RecyclingVariantsSchema);
const encodeInterval = Schema.encodeSync(RecyclingIntervalSchema);
const encodeOrigin = Schema.encodeSync(PostOriginSchema);

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date) => DateTime.fromDateUnsafe(date);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const pad = (value: number, length: number) =>
  String(value).padStart(length, "0");

// A calendar date as its `date` column holds it: YYYY-MM-DD.
const dayOf = ({
  day,
  month,
  year,
}: {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}) => `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;

const localDateOf = (day: string) => {
  const [year = 0, month = 0, dayOfMonth = 0] = day.split("-").map(Number);

  return { day: dayOfMonth, month, year };
};

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
  decodeRule({
    anchorAt: utc(row.anchorAt),
    count: Option.fromNullOr(row.count),
    createdAt: utc(row.createdAt),
    id: row.id,
    interval: row.interval,
    lastDueAt: utc(row.lastDueAt),
    made: row.made,
    nextDueAt: Option.fromNullOr(row.nextDueAt).pipe(Option.map(utc)),
    queueId: Option.fromNullOr(row.queueId),
    resumptions: row.resumptions,
    sourcePostId: row.sourcePostId,
    startedBy: Option.fromNullOr(row.startedBy),
    startedVia: row.startedVia,
    status: statusOf(row),
    timeZone: row.timeZone,
    until: Option.fromNullOr(row.until).pipe(Option.map(localDateOf)),
    variants: row.variants,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const rulesFrom = Effect.forEach((row: Row) => toRule(row));

const ruleFrom = (rows: readonly Row[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<RecyclingRule>())
    : toRule(row).pipe(Effect.map(Option.some));
};

const statusColumns = (status: RecyclingStatus) => {
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

const inWorkspace = (workspaceId: string, ruleId: string) =>
  and(
    eq(recyclingRules.workspaceId, workspaceId),
    eq(recyclingRules.id, ruleId)
  );

// What changes of a rule once it is started.
const changing = (rule: RecyclingRule) => ({
  ...statusColumns(rule.status),
  count: Option.getOrNull(rule.count),
  lastDueAt: date(rule.lastDueAt),
  made: rule.made,
  nextDueAt: rule.nextDueAt.pipe(Option.map(date), Option.getOrNull),
  resumptions: rule.resumptions,
  until: rule.until.pipe(Option.map(dayOf), Option.getOrNull),
  variants: encodeVariants(rule.variants),
});

/** Recycling rules in the publishing schema, through Drizzle. */
export const DrizzleRecyclingStore = Layer.effect(
  RecyclingStore,
  Effect.gen(function* DrizzleRecyclingStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return RecyclingStore.of({
      byId: (workspaceId, ruleId) =>
        db
          .select()
          .from(recyclingRules)
          .where(inWorkspace(workspaceId, ruleId))
          .pipe(Effect.mapError(failed), Effect.flatMap(ruleFrom)),
      // A transaction's advisory lock, in the two-key form: the first key
      // names what is claimed, the second the workspace.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/recycling-rules'), hashtext(${workspaceId}))`.pipe(
          Effect.asVoid,
          Effect.mapError(failed)
        ),
      countLive: (workspaceId) =>
        db
          .select({ live: count() })
          .from(recyclingRules)
          .where(
            and(
              eq(recyclingRules.workspaceId, workspaceId),
              ne(recyclingRules.status, "ended")
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.live ?? 0)
          ),
      due: (now, after, limit) =>
        db
          .select()
          .from(recyclingRules)
          .where(
            and(
              eq(recyclingRules.status, "active"),
              lte(recyclingRules.lastDueAt, date(now)),
              ...Option.toArray(
                after.pipe(
                  Option.map(({ id, lastDueAt }) =>
                    or(
                      gt(recyclingRules.lastDueAt, date(lastDueAt)),
                      and(
                        eq(recyclingRules.lastDueAt, date(lastDueAt)),
                        gt(recyclingRules.id, id)
                      )
                    )
                  )
                )
              )
            )
          )
          .orderBy(asc(recyclingRules.lastDueAt), asc(recyclingRules.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(rulesFrom)),
      insert: (rule) =>
        db
          .insert(recyclingRules)
          .values({
            ...changing(rule),
            anchorAt: date(rule.anchorAt),
            createdAt: date(rule.createdAt),
            id: rule.id,
            interval: encodeInterval(rule.interval),
            queueId: Option.getOrNull(rule.queueId),
            sourcePostId: rule.sourcePostId,
            startedBy: Option.getOrNull(rule.startedBy),
            startedVia: encodeOrigin(rule.startedVia),
            timeZone: rule.timeZone,
            workspaceId: rule.workspaceId,
          })
          .pipe(Effect.asVoid, Effect.mapError(failed)),
      list: (workspaceId, { after, limit, status }) =>
        db
          .select()
          .from(recyclingRules)
          .where(
            and(
              eq(recyclingRules.workspaceId, workspaceId),
              ...Option.toArray(
                status.pipe(Option.map((tag) => eq(recyclingRules.status, tag)))
              ),
              ...Option.toArray(
                after.pipe(Option.map((id) => gt(recyclingRules.id, id)))
              )
            )
          )
          .orderBy(asc(recyclingRules.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(rulesFrom)),
      lock: (workspaceId, ruleId) =>
        db
          .select()
          .from(recyclingRules)
          .where(inWorkspace(workspaceId, ruleId))
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(ruleFrom)),
      lockUnlessHeld: (ruleId) =>
        db
          .select()
          .from(recyclingRules)
          .where(eq(recyclingRules.id, ruleId))
          .for("update", { skipLocked: true })
          .pipe(Effect.mapError(failed), Effect.flatMap(ruleFrom)),
      ofSource: (workspaceId, postId) =>
        db
          .select()
          .from(recyclingRules)
          .where(
            and(
              eq(recyclingRules.workspaceId, workspaceId),
              eq(recyclingRules.sourcePostId, postId),
              ne(recyclingRules.status, "ended")
            )
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(ruleFrom)),
      overdue: (before) =>
        db
          .select({ late: count() })
          .from(recyclingRules)
          .where(
            and(
              eq(recyclingRules.status, "active"),
              lt(recyclingRules.nextDueAt, date(before))
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.late ?? 0)
          ),
      update: (rule) =>
        db
          .update(recyclingRules)
          .set(changing(rule))
          .where(inWorkspace(rule.workspaceId, rule.id))
          .pipe(Effect.asVoid, Effect.mapError(failed)),
    });
  })
);
