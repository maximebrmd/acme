import { and, count, desc, eq, gt, lt, lte, or, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { ConnectLinkStore } from "#channels/application/connect-link-store.ts";
import { maxLinkStarts, ConnectLink } from "#channels/domain/connect-link.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { connectLinks } from "./schema.ts";

type Row = typeof connectLinks.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written fails loudly instead of being trusted.
const decodeLink = Schema.decodeUnknownEffect(ConnectLink);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (stored: Date | null) =>
  Option.fromNullOr(stored).pipe(
    Option.map((at) => DateTime.fromDateUnsafe(at))
  );

// The status in LinkStatus's encoded form, checked as the row decodes.
const statusOf = (row: Row) => {
  const at = Option.getOrUndefined(utc(row.endedAt));

  if (row.status === "completed") {
    return { _tag: row.status, at, channelIds: row.channelIds };
  }

  return row.status === "revoked"
    ? { _tag: row.status, at }
    : { _tag: row.status };
};

// A link names the way in it was asked for, or none for the server's
// first: unlike a channel's row, none never stands for an older way in.
const toLink = (row: Row) =>
  decodeLink({
    browser: Option.fromNullOr(row.browserDigest),
    channelId: Option.fromNullOr(row.channelId),
    connectedChannels: row.channelIds,
    connectedPlatforms: row.connectedPlatforms,
    connection: Option.fromNullOr(row.connection),
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    createdBy: Option.fromNullOr(row.createdBy),
    expiresAt: DateTime.fromDateUnsafe(row.expiresAt),
    failure: Option.all({
      at: utc(row.failedAt),
      reason: Option.fromNullOr(row.failureReason),
    }),
    id: row.id,
    locale: Option.fromNullOr(row.locale),
    platforms: row.platforms ?? [row.platform],
    returnUrl: Option.fromNullOr(row.returnUrl),
    startedPlatform: Option.fromNullOr(row.startedPlatform),
    starts: row.starts,
    status: statusOf(row),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const one = (rows: readonly Row[]) =>
  Option.match(Option.fromUndefinedOr(rows[0]), {
    onNone: () => Effect.succeedNone,
    onSome: (row) => toLink(row).pipe(Effect.map(Option.some)),
  });

const pending = eq(connectLinks.status, "pending");

/** Connect links in the channels schema, each under its token's digest. */
export const DrizzleConnectLinkStore = Layer.effect(
  ConnectLinkStore,
  Effect.gen(function* DrizzleConnectLinkStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return ConnectLinkStore.of({
      byToken: (tokenDigest) =>
        db
          .select()
          .from(connectLinks)
          .where(eq(connectLinks.tokenDigest, tokenDigest))
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(one)),
      countWaiting: (workspaceId, now) =>
        db
          .select({ waiting: count() })
          .from(connectLinks)
          .where(
            and(
              eq(connectLinks.workspaceId, workspaceId),
              pending,
              gt(connectLinks.expiresAt, date(now))
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.waiting ?? 0)
          ),
      ended: (link) => {
        const { status } = link;

        return status._tag === "pending"
          ? Effect.succeed(false)
          : db
              .update(connectLinks)
              .set({
                browserDigest: null,
                channelIds:
                  status._tag === "completed"
                    ? [...status.channelIds]
                    : [...link.connectedChannels],
                connectedPlatforms: [...link.connectedPlatforms],
                endedAt: date(status.at),
                failedAt: null,
                failureReason: null,
                startedPlatform: null,
                status: status._tag,
              })
              .where(and(eq(connectLinks.id, link.id), pending))
              .returning({ id: connectLinks.id })
              .pipe(
                Effect.mapError(failed),
                Effect.map((rows) => rows.length > 0)
              );
      },
      failed: (linkId, failure) =>
        db
          .update(connectLinks)
          .set({ failedAt: date(failure.at), failureReason: failure.reason })
          .where(and(eq(connectLinks.id, linkId), pending))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      findIn: (workspaceId, linkId) =>
        db
          .select()
          .from(connectLinks)
          .where(
            and(
              eq(connectLinks.id, linkId),
              eq(connectLinks.workspaceId, workspaceId)
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(one)),
      holdWorkspace: (workspaceId) =>
        client`SELECT pg_advisory_xact_lock(hashtext('peal-server/channels/connect-links'), hashtext(${workspaceId}))`.pipe(
          Effect.mapError(failed),
          Effect.asVoid
        ),
      insert: (link, tokenDigest) =>
        db
          .insert(connectLinks)
          .values({
            browserDigest: null,
            channelId: Option.getOrNull(link.channelId),
            channelIds: [],
            connection: Option.getOrNull(link.connection),
            createdAt: date(link.createdAt),
            createdBy: Option.getOrNull(link.createdBy),
            expiresAt: date(link.expiresAt),
            id: link.id,
            locale: Option.getOrNull(link.locale),
            platform: link.platform,
            platforms: [...link.platforms],
            returnUrl: Option.getOrNull(link.returnUrl),
            starts: link.starts,
            status: link.status._tag,
            tokenDigest,
            workspaceId: link.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      list: (workspaceId, limit) =>
        db
          .select()
          .from(connectLinks)
          .where(eq(connectLinks.workspaceId, workspaceId))
          .orderBy(desc(connectLinks.id))
          .limit(limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toLink))
          ),
      lock: (linkId) =>
        db
          .select()
          .from(connectLinks)
          .where(eq(connectLinks.id, linkId))
          .limit(1)
          .for("update")
          .pipe(Effect.mapError(failed), Effect.flatMap(one)),
      progressed: (link) =>
        db
          .update(connectLinks)
          .set({
            browserDigest: null,
            channelIds: [...link.connectedChannels],
            connectedPlatforms: [...link.connectedPlatforms],
            failedAt: null,
            failureReason: null,
            startedPlatform: null,
          })
          .where(and(eq(connectLinks.id, link.id), pending))
          .returning({ id: connectLinks.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      // Over since `before`: ended then, or left pending past its time.
      purge: (before) =>
        db
          .delete(connectLinks)
          .where(
            or(
              lte(connectLinks.endedAt, date(before)),
              and(pending, lte(connectLinks.expiresAt, date(before)))
            )
          )
          .returning({ id: connectLinks.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
      // One more start, counted in the row so two at once count twice,
      // by the browser that holds the nonce.
      started: (link) =>
        db
          .update(connectLinks)
          .set({
            browserDigest: Option.getOrNull(link.browser),
            startedPlatform: Option.getOrNull(link.startedPlatform),
            starts: sql`${connectLinks.starts} + 1`,
          })
          .where(
            and(
              eq(connectLinks.id, link.id),
              pending,
              lt(connectLinks.starts, maxLinkStarts)
            )
          )
          .returning({ id: connectLinks.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
    });
  })
);
