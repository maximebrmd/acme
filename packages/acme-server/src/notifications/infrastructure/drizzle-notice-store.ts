import { and, asc, count, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { NoticeStore } from "#notifications/application/notice-store.ts";
import type { NewNotice } from "#notifications/application/notice-store.ts";
import { NoticeEventSchema } from "#notifications/domain/notice-event.ts";
import { NoticeIdSchema } from "#notifications/domain/notice-id.ts";
import { Notice } from "#notifications/domain/notice.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { notices } from "./schema.ts";

// Events are stored as JSON, which their schema reads back: fields are only
// ever added to it.
const EventJson = Schema.toCodecJson(NoticeEventSchema);

const encodeEvent = Schema.encodeEffect(EventJson);

const decodeEvent = Schema.decodeUnknownEffect(EventJson);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

type Row = typeof notices.$inferSelect;

const noticeOf = (row: Row) =>
  decodeEvent(row.event).pipe(
    Effect.orDie,
    Effect.map(
      (event) =>
        new Notice({
          createdAt: DateTime.fromDateUnsafe(row.createdAt),
          event,
          id: NoticeIdSchema.make(row.id),
          readAt: Option.fromNullOr(row.readAt).pipe(
            Option.map((at) => DateTime.fromDateUnsafe(at))
          ),
          userId: UserIdSchema.make(row.userId),
          workspaceId: WorkspaceIdSchema.make(row.workspaceId),
        })
    )
  );

const rowOf = (key: string, { email, notice }: NewNotice) =>
  encodeEvent(notice.event).pipe(
    Effect.orDie,
    Effect.map((event) => ({
      createdAt: date(notice.createdAt),
      emailStatus: email ? "pending" : "none",
      event,
      eventKey: key,
      id: notice.id,
      kind: notice.event._tag,
      readAt: notice.readAt.pipe(Option.map(date), Option.getOrNull),
      userId: notice.userId,
      workspaceId: notice.workspaceId,
    }))
  );

/** Notices in the notifications schema. */
export const DrizzleNoticeStore = Layer.effect(
  NoticeStore,
  Effect.gen(function* DrizzleNoticeStore() {
    const db = yield* Drizzle;

    const unread = Effect.fn("NoticeStore.unread")(function* unread(
      userId: string
    ) {
      const [row] = yield* db
        .select({ unread: count() })
        .from(notices)
        .where(and(eq(notices.userId, userId), isNull(notices.readAt)))
        .pipe(Effect.mapError(failed));

      return row?.unread ?? 0;
    });

    return NoticeStore.of({
      add: Effect.fn("NoticeStore.add")(function* add(key, added) {
        if (added.length === 0) {
          return;
        }

        const rows = yield* Effect.all(
          added.map((notice) => rowOf(key, notice))
        );

        // A notice already there for the event and the user stays as it is.
        yield* db
          .insert(notices)
          .values(rows)
          .onConflictDoNothing()
          .pipe(Effect.mapError(failed));
      }),
      markAllRead: (userId, at) =>
        db
          .update(notices)
          .set({ readAt: date(at) })
          .where(and(eq(notices.userId, userId), isNull(notices.readAt)))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      markRead: (userId, noticeIds, at) =>
        noticeIds.length === 0
          ? Effect.void
          : db
              .update(notices)
              .set({ readAt: date(at) })
              .where(
                and(
                  eq(notices.userId, userId),
                  inArray(notices.id, [...noticeIds]),
                  isNull(notices.readAt)
                )
              )
              .pipe(Effect.mapError(failed), Effect.asVoid),
      page: Effect.fn("NoticeStore.page")(function* page(
        userId,
        { after, limit }
      ) {
        const rows = yield* db
          .select()
          .from(notices)
          .where(
            and(
              eq(notices.userId, userId),
              after.pipe(
                Option.map((id) => lt(notices.id, id)),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(desc(notices.id))
          .limit(limit + 1)
          .pipe(Effect.mapError(failed));

        const items = yield* Effect.all(
          rows.slice(0, limit).map((row) => noticeOf(row))
        );

        const last = items.at(-1);

        return {
          items,
          next:
            rows.length > limit && last !== undefined
              ? Option.some(last.id)
              : Option.none(),
        };
      }),
      pendingEmails: Effect.fn("NoticeStore.pendingEmails")(
        function* pendingEmails(key) {
          const rows = yield* db
            .select()
            .from(notices)
            .where(
              and(eq(notices.eventKey, key), eq(notices.emailStatus, "pending"))
            )
            .orderBy(asc(notices.id))
            .pipe(Effect.mapError(failed));

          return yield* Effect.all(rows.map((row) => noticeOf(row)));
        }
      ),
      resolve: (key, at) =>
        Effect.gen(function* resolve() {
          yield* db
            .update(notices)
            .set({ readAt: date(at) })
            .where(and(eq(notices.eventKey, key), isNull(notices.readAt)));

          yield* db
            .update(notices)
            .set({ emailSettledAt: date(at), emailStatus: "skipped" })
            .where(
              and(eq(notices.eventKey, key), eq(notices.emailStatus, "pending"))
            );
        }).pipe(Effect.mapError(failed)),
      settleEmail: (noticeId, outcome, at) =>
        db
          .update(notices)
          .set({ emailSettledAt: date(at), emailStatus: outcome })
          .where(
            and(eq(notices.id, noticeId), eq(notices.emailStatus, "pending"))
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      unread,
    });
  })
);
