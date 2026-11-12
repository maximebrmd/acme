import { and, asc, desc, eq, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { LivePostChangeStore } from "#publishing/application/live-post-change-store.ts";
import type {
  CallStart,
  OpenChange,
} from "#publishing/application/live-post-change-store.ts";
import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import {
  LivePostChange,
  PartToRemoveSchema,
} from "#publishing/domain/live-post-change.ts";
import { PostOriginSchema } from "#publishing/domain/post-origin.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { livePostChanges } from "./schema.ts";

type ChangeRow = typeof livePostChanges.$inferSelect;

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (value: Date) => DateTime.fromDateUnsafe(value);

// The parts left, and how the change was asked for, as their columns hold
// them: JSON the domain decodes.
const PartsJson = Schema.toCodecJson(Schema.Array(PartToRemoveSchema));

const OriginJson = Schema.toCodecJson(Schema.NullOr(PostOriginSchema));

const decodeParts = Schema.decodeUnknownEffect(PartsJson);

const decodeOrigin = Schema.decodeUnknownEffect(OriginJson);

const encodeParts = Schema.encodeSync(PartsJson);

const encodeOrigin = Schema.encodeSync(OriginJson);

const decodeChange = Schema.decodeUnknownEffect(LivePostChange);

const toChange = Effect.fnUntraced(function* toChange(row: ChangeRow) {
  const partsLeft = yield* decodeParts(row.partsLeft);
  const requestedVia = yield* decodeOrigin(row.requestedVia);

  return yield* decodeChange({
    alreadyGone: row.alreadyGone,
    channelId: row.channelId,
    failureCode: Option.fromNullOr(row.failureCode),
    finishedAt: Option.fromNullOr(row.finishedAt).pipe(Option.map(utc)),
    id: row.id,
    kind: row.kind,
    partsLeft,
    postId: row.postId,
    requestedAt: utc(row.requestedAt),
    requestedBy: Option.fromNullOr(row.requestedBy),
    requestedVia: Option.fromNullOr(requestedVia),
    status: row.status,
    targetId: row.targetId,
    text: Option.fromNullOr(row.text),
    workspaceId: row.workspaceId,
  });
}, Effect.orDie);

const changeFrom = (rows: readonly ChangeRow[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<LivePostChange>())
    : toChange(row).pipe(Effect.map(Option.some));
};

// What a change decides of its row; the journal's columns are written by
// beginCall and endCall alone.
const changeColumns = (change: LivePostChange) => ({
  alreadyGone: change.alreadyGone,
  failureCode: Option.getOrNull(change.failureCode),
  finishedAt: change.finishedAt.pipe(Option.map(date), Option.getOrNull),
  partsLeft: encodeParts(change.partsLeft),
  status: change.status,
  // An edit's text while it is pending: a change that ends clears it.
  text: Option.getOrNull(change.text),
});

const decodeOpen = Schema.decodeUnknownEffect(
  Schema.Struct({ changeId: LivePostChangeIdSchema, inFlight: Schema.Boolean })
);

/** LivePostChangeStore on the publishing schema, through Drizzle. */
export const DrizzleLivePostChangeStore = Layer.effect(
  LivePostChangeStore,
  Effect.gen(function* DrizzleLivePostChangeStore() {
    const db = yield* Drizzle;

    const select = (changeId: string) =>
      db.select().from(livePostChanges).where(eq(livePostChanges.id, changeId));

    return LivePostChangeStore.of({
      beginCall: (changeId, at) =>
        db
          .update(livePostChanges)
          .set({
            attempts: sql`${livePostChanges.attempts} + 1`,
            callFinishedAt: null,
            callStartedAt: date(at),
          })
          .where(
            and(
              eq(livePostChanges.id, changeId),
              eq(livePostChanges.status, "pending")
            )
          )
          // The row before the change (`old`, Postgres 18): a call that
          // began and never ended.
          .returning({
            resumed: sql<boolean>`(old.call_started_at is not null and old.call_finished_at is null)`,
          })
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]): CallStart => {
              if (row === undefined) {
                return "refused";
              }

              return row.resumed ? "resumed" : "begun";
            })
          ),
      endCall: (changeId, at) =>
        db
          .update(livePostChanges)
          .set({ callFinishedAt: date(at) })
          .where(eq(livePostChanges.id, changeId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      find: (changeId) =>
        select(changeId).pipe(
          Effect.mapError(failed),
          Effect.flatMap(changeFrom)
        ),
      insert: (change) =>
        db
          .insert(livePostChanges)
          .values({
            ...changeColumns(change),
            channelId: change.channelId,
            id: change.id,
            kind: change.kind,
            postId: change.postId,
            requestedAt: date(change.requestedAt),
            requestedBy: Option.getOrNull(change.requestedBy),
            requestedVia: encodeOrigin(Option.getOrNull(change.requestedVia)),
            targetId: change.targetId,
            workspaceId: change.workspaceId,
          })
          // The pending change of the target, made by another request.
          .onConflictDoNothing()
          .returning({ id: livePostChanges.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length === 1)
          ),
      latestOf: (targetId, kind) =>
        db
          .select()
          .from(livePostChanges)
          .where(
            and(
              eq(livePostChanges.targetId, targetId),
              kind === undefined ? undefined : eq(livePostChanges.kind, kind)
            )
          )
          .orderBy(desc(livePostChanges.id))
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(changeFrom)),
      lock: (changeId) =>
        select(changeId)
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(changeFrom)),
      lockOpen: (workspaceId) =>
        db
          .select({
            callFinishedAt: livePostChanges.callFinishedAt,
            callStartedAt: livePostChanges.callStartedAt,
            changeId: livePostChanges.id,
          })
          .from(livePostChanges)
          .where(
            and(
              eq(livePostChanges.workspaceId, workspaceId),
              eq(livePostChanges.status, "pending")
            )
          )
          .orderBy(asc(livePostChanges.id))
          .for("update")
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach((row) =>
                decodeOpen({
                  changeId: row.changeId,
                  inFlight:
                    row.callStartedAt !== null && row.callFinishedAt === null,
                }).pipe(Effect.orDie)
              )
            ),
            Effect.map((open): readonly OpenChange[] => open)
          ),
      ofPost: (workspaceId, postId) =>
        db
          .select()
          .from(livePostChanges)
          .where(
            and(
              eq(livePostChanges.workspaceId, workspaceId),
              eq(livePostChanges.postId, postId)
            )
          )
          .orderBy(desc(livePostChanges.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toChange))
          ),
      update: (next, current) =>
        db
          .update(livePostChanges)
          .set(changeColumns(next))
          .where(
            and(
              eq(livePostChanges.id, current.id),
              eq(livePostChanges.status, current.status)
            )
          )
          .returning({ id: livePostChanges.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length === 1)
          ),
    });
  })
);
