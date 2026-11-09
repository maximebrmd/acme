import { and, asc, eq, lte, or, sql } from "drizzle-orm";
import {
  DateTime,
  Duration,
  Effect,
  Layer,
  Match,
  Option,
  Schema,
} from "effect";
import { SqlClient, SqlError } from "effect/sql";

import { ChannelAlreadyConnected } from "#channels/application/channel-already-connected.ts";
import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { tokenKeyIdOf } from "#channels/application/token-cipher.ts";
import { Channel } from "#channels/domain/channel.ts";
import type { TokenLifetime } from "#channels/domain/channel.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { channels } from "./schema.ts";

type Row = typeof channels.$inferSelect;

// Rows are decoded with the domain's schemas, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeChannel = Schema.decodeUnknownEffect(Channel);

const decodeCredentials = Schema.decodeUnknownEffect(ChannelCredentials);

const failed = (cause: unknown) => new DatabaseError({ cause });

const utc = (date: Date | null) =>
  date === null ? undefined : DateTime.fromDateUnsafe(date);

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

// The status in ChannelStatus's encoded form, checked when the row decodes.
const statusOf = (row: Row) =>
  row.status === "disabled"
    ? { _tag: row.status, refreshNeeded: row.refreshNeeded }
    : { _tag: row.status };

const toChannel = (row: Row) =>
  decodeChannel({
    accountId: row.accountId,
    avatarUrl: Option.fromNullOr(row.avatarUrl),
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    displayName: Option.fromNullOr(row.displayName),
    handle: row.handle,
    id: row.id,
    platform: row.platform,
    scopes: row.scopes,
    status: statusOf(row),
    token: {
      _tag: row.tokenKind,
      expiresAt: utc(row.tokenExpiresAt),
      issuedAt: utc(row.tokenIssuedAt),
    },
    updatedAt: DateTime.fromDateUnsafe(row.updatedAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const tokenColumns = (token: TokenLifetime) =>
  Match.valueTags(token, {
    nonExpiring: () => ({ tokenExpiresAt: null, tokenIssuedAt: null }),
    nonRefreshable: ({ expiresAt, issuedAt }) => ({
      tokenExpiresAt: date(expiresAt),
      tokenIssuedAt: date(issuedAt),
    }),
    refreshable: ({ expiresAt }) => ({
      tokenExpiresAt: date(expiresAt),
      tokenIssuedAt: null,
    }),
  });

// Every column the channel decides, so a write leaves no stale value behind.
const channelColumns = (channel: Channel) => {
  const { status, token } = channel;

  return {
    accountId: channel.accountId,
    avatarUrl: Option.getOrNull(channel.avatarUrl),
    createdAt: date(channel.createdAt),
    displayName: Option.getOrNull(channel.displayName),
    handle: channel.handle,
    id: channel.id,
    platform: channel.platform,
    refreshNeeded:
      status._tag === "refreshNeeded" ||
      (status._tag === "disabled" && status.refreshNeeded),
    scopes: [...channel.scopes],
    status: status._tag,
    tokenKind: token._tag,
    ...tokenColumns(token),
    updatedAt: date(channel.updatedAt),
    workspaceId: channel.workspaceId,
  };
};

const credentialColumns = ({
  accessToken,
  grantedBy,
  refreshToken,
}: ChannelCredentials) => ({
  accessToken,
  grantedBy: grantedBy ?? null,
  refreshToken: Option.getOrNull(refreshToken),
  tokenKeyId: tokenKeyIdOf(accessToken),
});

const byId = (workspaceId: WorkspaceId, channelId: ChannelId) =>
  and(eq(channels.workspaceId, workspaceId), eq(channels.id, channelId));

const firstChannel = (rows: readonly Row[]) => {
  const [row] = rows;

  return row === undefined
    ? Effect.succeed(Option.none<Channel>())
    : toChannel(row).pipe(Effect.map(Option.some));
};

/** Channels in the channels schema, through Drizzle. */
export const DrizzleChannelRepository = Layer.effect(
  ChannelRepository,
  Effect.gen(function* DrizzleChannelRepository() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return ChannelRepository.of({
      // A transaction's advisory lock, in the two-key form: the first key
      // names what it guards, the second the workspace.
      addingTo: (workspaceId, adding) =>
        client
          .withTransaction(
            client`SELECT pg_advisory_xact_lock(hashtext('acme-server/channels/additions'), hashtext(${workspaceId}))`.pipe(
              Effect.andThen(adding)
            )
          )
          .pipe(
            Effect.catchIf(SqlError.isSqlError, (failure) =>
              Effect.fail(failed(failure))
            ),
            Effect.withSpan("ChannelRepository.addingTo")
          ),
      credentials: (channelId) =>
        db
          .select({
            accessToken: channels.accessToken,
            refreshToken: channels.refreshToken,
          })
          .from(channels)
          .where(eq(channels.id, channelId))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeed(Option.none<ChannelCredentials>())
                : decodeCredentials({
                    accessToken: row.accessToken,
                    refreshToken: Option.fromNullOr(row.refreshToken),
                  }).pipe(Effect.orDie, Effect.map(Option.some))
            )
          ),
      dueForRefresh: ({ cutoffs, limit }) => {
        const due = cutoffs.map(({ before, platform }) =>
          and(
            eq(channels.platform, platform),
            lte(channels.tokenExpiresAt, date(before))
          )
        );

        return due.length === 0
          ? Effect.succeed([])
          : db
              .select()
              .from(channels)
              .where(
                and(
                  eq(channels.status, "active"),
                  eq(channels.tokenKind, "refreshable"),
                  or(...due)
                )
              )
              .orderBy(asc(channels.tokenExpiresAt), asc(channels.id))
              .limit(limit)
              .pipe(
                Effect.mapError(failed),
                Effect.flatMap(Effect.forEach(toChannel))
              );
      },
      findByAccount: (workspaceId, platform, accountId) =>
        db
          .select()
          .from(channels)
          .where(
            and(
              eq(channels.workspaceId, workspaceId),
              eq(channels.platform, platform),
              eq(channels.accountId, accountId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(firstChannel)),
      findById: (workspaceId, channelId) =>
        db
          .select()
          .from(channels)
          .where(byId(workspaceId, channelId))
          .pipe(Effect.mapError(failed), Effect.flatMap(firstChannel)),
      get: (channelId) =>
        db
          .select()
          .from(channels)
          .where(eq(channels.id, channelId))
          .pipe(Effect.mapError(failed), Effect.flatMap(firstChannel)),
      insert: (channel, credentials) =>
        db
          .insert(channels)
          .values({
            ...channelColumns(channel),
            ...credentialColumns(credentials),
          })
          .onConflictDoNothing({
            target: [
              channels.workspaceId,
              channels.platform,
              channels.accountId,
            ],
          })
          .returning({ id: channels.id })
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) =>
              rows.length === 1
                ? Effect.void
                : Effect.fail(
                    new ChannelAlreadyConnected({
                      accountId: channel.accountId,
                      platform: channel.platform,
                    })
                  )
            )
          ),
      list: (workspaceId) =>
        db
          .select()
          .from(channels)
          .where(eq(channels.workspaceId, workspaceId))
          .orderBy(asc(channels.createdAt), asc(channels.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toChannel))
          ),
      // The warning window of `reconnectWarningFrom`: the lead time, or half
      // the token's lifetime when that is shorter, before it expires.
      needingReconnect: ({ leadTime, limit, now }) =>
        db
          .select()
          .from(channels)
          .where(
            or(
              eq(channels.status, "refreshNeeded"),
              and(
                eq(channels.status, "active"),
                eq(channels.tokenKind, "nonRefreshable"),
                sql`${channels.tokenExpiresAt} - LEAST(make_interval(secs => ${Duration.toSeconds(leadTime)}), (${channels.tokenExpiresAt} - ${channels.tokenIssuedAt}) / 2) <= ${DateTime.formatIso(now)}::timestamptz`
              )
            )
          )
          // False sorts first: the active channels, then the marked ones.
          .orderBy(
            sql`${channels.status} = 'refreshNeeded'`,
            asc(channels.updatedAt),
            asc(channels.id)
          )
          .limit(limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toChannel))
          ),
      remove: (workspaceId, channelId) =>
        db
          .delete(channels)
          .where(byId(workspaceId, channelId))
          .returning({ id: channels.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      update: (channel, credentials) =>
        db
          .update(channels)
          .set({
            ...channelColumns(channel),
            ...Option.match(credentials, {
              onNone: () => ({}),
              onSome: credentialColumns,
            }),
          })
          .where(byId(channel.workspaceId, channel.id))
          .returning({ id: channels.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
    });
  })
);
