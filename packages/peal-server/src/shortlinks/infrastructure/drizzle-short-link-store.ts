import { and, asc, between, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { CodeTaken } from "#shortlinks/application/code-taken.ts";
import { ShortLinkStore } from "#shortlinks/application/short-link-store.ts";
import type { ClickRange } from "#shortlinks/domain/click-range.ts";
import { ShortCodeSchema } from "#shortlinks/domain/short-code.ts";
import { ShortLinkIdSchema } from "#shortlinks/domain/short-link-id.ts";
import { ShortLink } from "#shortlinks/domain/short-link.ts";

import { clicks, links, settings } from "./schema.ts";
import type { LinkRow } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeLink = Schema.decodeUnknownEffect(ShortLink);

// A row the domain does not accept fails loudly instead of being trusted.
const toLink = (row: LinkRow) =>
  decodeLink({
    channelId: row.channelId,
    code: row.code,
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    destination: row.destination,
    disabledAt: Option.fromNullishOr(row.disabledAt).pipe(
      Option.map(DateTime.fromDateUnsafe)
    ),
    id: row.id,
    part: row.part,
    postId: row.postId,
    targetId: row.targetId,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const withinRange = (range: ClickRange) =>
  between(
    clicks.day,
    DateTime.toDateUtc(range.from),
    DateTime.toDateUtc(range.to)
  );

const linksOf = (rows: readonly LinkRow[]) =>
  Effect.all(rows.map((row) => toLink(row)));

/**
 * Short links in the shortlinks schema. Issuing is one insert that does
 * nothing on any conflict, then one read of the target's part's row for
 * the destination: found, its code; missing, the conflict was another
 * link's code. A click is one upsert on its link's day.
 */
export const DrizzleShortLinkStore = Layer.effect(
  ShortLinkStore,
  Effect.gen(function* DrizzleShortLinkStore() {
    const db = yield* Drizzle;
    const sqlClient = yield* SqlClient.SqlClient;

    return ShortLinkStore.of({
      byCode: (code) =>
        db
          .select()
          .from(links)
          .where(eq(links.code, code))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) =>
              rows[0] === undefined
                ? Effect.succeedNone
                : toLink(rows[0]).pipe(Effect.map(Option.some))
            )
          ),
      byDefault: (workspaceId) =>
        db
          .select({ byDefault: settings.byDefault })
          .from(settings)
          .where(eq(settings.workspaceId, workspaceId))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows[0]?.byDefault ?? false)
          ),
      count: (linkId, day) =>
        db
          .insert(clicks)
          .values({ clicks: 1, day: DateTime.toDateUtc(day), linkId })
          .onConflictDoUpdate({
            set: { clicks: sql`${clicks.clicks} + 1` },
            target: [clicks.linkId, clicks.day],
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      days: (linkId, range) =>
        db
          .select({ clicks: clicks.clicks, day: clicks.day })
          .from(clicks)
          .where(and(eq(clicks.linkId, linkId), withinRange(range)))
          .orderBy(asc(clicks.day))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) =>
              rows.map((row) => ({
                clicks: row.clicks,
                day: DateTime.fromDateUnsafe(row.day),
              }))
            )
          ),
      eraseWorkspace: (workspaceId) =>
        Effect.all(
          [
            db.delete(links).where(eq(links.workspaceId, workspaceId)),
            db.delete(settings).where(eq(settings.workspaceId, workspaceId)),
          ],
          { discard: true }
        ).pipe(Effect.mapError(failed)),
      exportWorkspace: (workspaceId) =>
        db
          .select()
          .from(links)
          .where(eq(links.workspaceId, workspaceId))
          .orderBy(asc(links.id))
          .pipe(Effect.mapError(failed), Effect.flatMap(linksOf)),
      issue: Effect.fn("ShortLinkStore.issue")(function* issue(asked, fresh) {
        yield* db
          .insert(links)
          .values({
            channelId: asked.channelId,
            code: fresh.code,
            createdAt: DateTime.toDateUtc(fresh.createdAt),
            destination: asked.destination,
            id: fresh.id,
            part: asked.part,
            postId: asked.postId,
            targetId: asked.targetId,
            workspaceId: asked.workspaceId,
          })
          .onConflictDoNothing()
          .pipe(Effect.mapError(failed));

        const rows = yield* db
          .select({ code: links.code })
          .from(links)
          .where(
            and(
              eq(links.targetId, asked.targetId),
              eq(links.part, asked.part),
              eq(links.destination, asked.destination)
            )
          )
          .pipe(Effect.mapError(failed));

        const [held] = rows;

        if (held === undefined) {
          return yield* new CodeTaken();
        }

        return ShortCodeSchema.make(held.code);
      }),
      linkOf: (workspaceId, linkId) =>
        db
          .select()
          .from(links)
          .where(and(eq(links.workspaceId, workspaceId), eq(links.id, linkId)))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) =>
              rows[0] === undefined
                ? Effect.succeedNone
                : toLink(rows[0]).pipe(Effect.map(Option.some))
            )
          ),
      page: Effect.fn("ShortLinkStore.page")(
        function* page(workspaceId, filter, range) {
          const rows = yield* db
            .select()
            .from(links)
            .where(
              and(
                eq(links.workspaceId, workspaceId),
                ...Option.toArray(
                  filter.cursor.pipe(
                    Option.map((cursor) => lt(links.id, cursor))
                  )
                ),
                ...Option.toArray(
                  filter.postId.pipe(
                    Option.map((postId) => eq(links.postId, postId))
                  )
                ),
                ...Option.toArray(
                  filter.channelId.pipe(
                    Option.map((channelId) => eq(links.channelId, channelId))
                  )
                )
              )
            )
            .orderBy(desc(links.id))
            .limit(filter.limit + 1)
            .pipe(Effect.mapError(failed));

          const shown = rows.slice(0, filter.limit);
          const found = yield* linksOf(shown);

          const totals =
            shown.length === 0
              ? []
              : yield* db
                  .select({
                    clicks: sql<number>`sum(${clicks.clicks})::int`,
                    linkId: clicks.linkId,
                  })
                  .from(clicks)
                  .where(
                    and(
                      inArray(
                        clicks.linkId,
                        shown.map((row) => row.id)
                      ),
                      withinRange(range)
                    )
                  )
                  .groupBy(clicks.linkId)
                  .pipe(Effect.mapError(failed));

          const last = found.at(-1);

          return {
            links: found.map((link) => ({
              clicks:
                totals.find((total) => total.linkId === link.id)?.clicks ?? 0,
              link,
            })),
            next:
              rows.length > filter.limit && last !== undefined
                ? Option.some(ShortLinkIdSchema.make(last.id))
                : Option.none(),
          };
        }
      ),
      // Counted in the database: a purge may be many rows.
      purge: (before, limit) =>
        sqlClient<{
          readonly purged: number;
        }>`WITH purged AS (DELETE FROM shortlinks.clicks WHERE ctid IN (SELECT ctid FROM shortlinks.clicks WHERE day < ${DateTime.formatIsoDateUtc(before)}::date LIMIT ${limit}) RETURNING 1) SELECT count(*)::int AS purged FROM purged`.pipe(
          Effect.mapError(failed),
          Effect.map((rows) => rows[0]?.purged ?? 0)
        ),
      setByDefault: (workspaceId, byDefault) =>
        db
          .insert(settings)
          .values({ byDefault, workspaceId })
          .onConflictDoUpdate({
            set: { byDefault },
            target: settings.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      setDisabled: (code, disabledAt) =>
        db
          .update(links)
          .set({
            disabledAt: Option.match(disabledAt, {
              onNone: () => null,
              onSome: DateTime.toDateUtc,
            }),
          })
          .where(eq(links.code, code))
          .returning({ id: links.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
    });
  })
);
