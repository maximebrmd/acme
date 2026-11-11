import { and, asc, eq, gt, inArray, lte, ne } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { QueueStore } from "#publishing/application/queue-store.ts";
import {
  Queue,
  QueueSlotsSchema,
  queueKeyOf,
} from "#publishing/domain/queue.ts";
import type { TakenSlots } from "#publishing/domain/queue.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { PostId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { posts, queues } from "./schema.ts";

type Row = typeof queues.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeQueue = Schema.decodeUnknownEffect(Queue);

// A queue's slots as their column holds them: JSON.
const encodeSlots = Schema.encodeSync(QueueSlotsSchema);

// What holds a slot: a post going out at its instant, or about to.
const holding = ["scheduled", "awaitingApproval", "publishing"];

const failed = (cause: unknown) => new DatabaseError({ cause });

const toQueue = (row: Row) =>
  decodeQueue({
    channelIds: row.channelIds,
    channelSetId: Option.fromNullOr(row.channelSetId),
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    id: row.id,
    isDefault: row.isDefault,
    name: row.name,
    slots: row.slots,
    timeZone: row.timeZone,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const queueFrom = (rows: readonly Row[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<Queue>())
    : toQueue(row).pipe(Effect.map(Option.some));
};

// What a member writes of a queue, as its columns hold it.
const written = (queue: Queue) => ({
  channelIds: [...queue.channelIds],
  channelSetId: Option.getOrNull(queue.channelSetId),
  isDefault: queue.isDefault,
  name: queue.name,
  nameKey: queueKeyOf(queue.name),
  slots: encodeSlots(queue.slots),
  timeZone: queue.timeZone,
});

/** Queues in the publishing schema, through Drizzle. */
export const DrizzleQueueStore = Layer.effect(
  QueueStore,
  Effect.gen(function* DrizzleQueueStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return QueueStore.of({
      byId: (workspaceId, queueId) =>
        db
          .select()
          .from(queues)
          .where(
            and(eq(queues.workspaceId, workspaceId), eq(queues.id, queueId))
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(queueFrom)),
      // Transactions' advisory locks, in the two-key form: the first key
      // names what is claimed, the second the workspace or the queue.
      claim: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/queues'), hashtext(${workspaceId}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid
        ),
      findDefault: (workspaceId) =>
        db
          .select()
          .from(queues)
          .where(
            and(eq(queues.workspaceId, workspaceId), eq(queues.isDefault, true))
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(queueFrom)),
      forgetChannelSet: (workspaceId, setId) =>
        db
          .update(queues)
          .set({ channelSetId: null })
          .where(
            and(
              eq(queues.workspaceId, workspaceId),
              eq(queues.channelSetId, setId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      insert: (queue) =>
        db
          .insert(queues)
          .values({
            ...written(queue),
            createdAt: DateTime.toDateUtc(queue.createdAt),
            id: queue.id,
            workspaceId: queue.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      list: (workspaceId) =>
        db
          .select()
          .from(queues)
          .where(eq(queues.workspaceId, workspaceId))
          .orderBy(asc(queues.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toQueue))
          ),
      lock: (queueId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/publishing/queue-slots'), hashtext(${queueId}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("QueueStore.lock")
        ),
      remove: (workspaceId, queueId) =>
        Effect.gen(function* remove() {
          // Its posts stay where they are, without it.
          yield* db
            .update(posts)
            .set({ queueId: null })
            .where(
              and(
                eq(posts.workspaceId, workspaceId),
                eq(posts.queueId, queueId)
              )
            );

          yield* db
            .delete(queues)
            .where(
              and(eq(queues.workspaceId, workspaceId), eq(queues.id, queueId))
            );
        }).pipe(Effect.mapError(failed)),
      takenFrom: (queueId, after, until, except = Option.none()) =>
        db
          .select({ id: posts.id, scheduledAt: posts.scheduledAt })
          .from(posts)
          .where(
            and(
              eq(posts.queueId, queueId),
              gt(posts.scheduledAt, DateTime.toDateUtc(after)),
              lte(posts.scheduledAt, DateTime.toDateUtc(until)),
              inArray(posts.status, holding),
              ...except.pipe(
                Option.map((postId) => ne(posts.id, postId)),
                Option.toArray
              )
            )
          )
          .orderBy(asc(posts.scheduledAt), asc(posts.id))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => {
              const taken = new Map<number, PostId>();

              for (const { id, scheduledAt } of rows) {
                const at = scheduledAt?.getTime();

                if (at !== undefined && !taken.has(at)) {
                  taken.set(at, PostIdSchema.make(id));
                }
              }

              const held: TakenSlots = taken;

              return held;
            }),
            Effect.withSpan("QueueStore.takenFrom")
          ),
      update: (queue) =>
        db
          .update(queues)
          .set(written(queue))
          .where(
            and(
              eq(queues.workspaceId, queue.workspaceId),
              eq(queues.id, queue.id)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
