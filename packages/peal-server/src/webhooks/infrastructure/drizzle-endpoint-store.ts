import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlError } from "effect/sql";

import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { EndpointStore } from "#webhooks/application/ports/endpoint-store.ts";
import type { StoredSecrets } from "#webhooks/application/ports/endpoint-store.ts";
import { SealedSecretSchema } from "#webhooks/domain/sealed-secret.ts";
import type { WebhookEndpointId } from "#webhooks/domain/webhook-endpoint-id.ts";
import { WebhookEndpoint } from "#webhooks/domain/webhook-endpoint.ts";

import { endpoints } from "./schema.ts";

type Row = typeof endpoints.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written (a bug, or a hand edit) fails loudly instead of being trusted.
const decodeEndpoint = Schema.decodeUnknownEffect(WebhookEndpoint);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (stored: Date | null) =>
  Option.fromNullOr(stored).pipe(
    Option.map((at) => DateTime.fromDateUnsafe(at))
  );

const toEndpoint = (row: Row) =>
  decodeEndpoint({
    createdAt: DateTime.fromDateUnsafe(row.createdAt),
    description: row.description,
    eventTypes: row.eventTypes,
    failingSince: utc(row.failingSince),
    id: row.id,
    previousSecretExpiresAt: utc(row.previousSecretExpiresAt),
    status:
      row.status === "disabled"
        ? {
            _tag: row.status,
            at: Option.getOrUndefined(utc(row.disabledAt)),
            reason: row.disabledReason,
          }
        : { _tag: row.status },
    updatedAt: DateTime.fromDateUnsafe(row.updatedAt),
    url: row.url,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

// What a member, or the endpoint's own failures, change of it.
const settingsOf = (endpoint: WebhookEndpoint) => {
  const { status } = endpoint;
  const off = status._tag === "disabled" ? status : undefined;

  return {
    description: endpoint.description,
    disabledAt: off === undefined ? null : date(off.at),
    disabledReason: off?.reason ?? null,
    eventTypes: [...endpoint.eventTypes],
    failingSince: endpoint.failingSince.pipe(
      Option.map(date),
      Option.getOrNull
    ),
    status: status._tag,
    updatedAt: date(endpoint.updatedAt),
    url: endpoint.url,
  };
};

const byId = (workspaceId: WorkspaceId, endpointId: WebhookEndpointId) =>
  and(eq(endpoints.workspaceId, workspaceId), eq(endpoints.id, endpointId));

const some = (rows: readonly Row[]) =>
  Option.fromUndefinedOr(rows[0]).pipe(
    Option.match({
      onNone: () => Effect.succeed(Option.none<WebhookEndpoint>()),
      onSome: (row) => toEndpoint(row).pipe(Effect.map(Option.some)),
    })
  );

/** Webhook endpoints in the webhooks schema. */
export const DrizzleEndpointStore = Layer.effect(
  EndpointStore,
  Effect.gen(function* DrizzleEndpointStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return EndpointStore.of({
      addingTo: (workspaceId, adding) =>
        client
          .withTransaction(
            client`SELECT pg_advisory_xact_lock(hashtext('peal-server/webhooks/additions'), hashtext(${workspaceId}))`.pipe(
              Effect.andThen(adding)
            )
          )
          .pipe(
            Effect.catchIf(SqlError.isSqlError, (failure) =>
              Effect.fail(failed(failure))
            ),
            Effect.withSpan("EndpointStore.addingTo")
          ),
      clearFailing: (endpointId) =>
        db
          .update(endpoints)
          .set({ failingSince: null })
          .where(
            and(eq(endpoints.id, endpointId), isNotNull(endpoints.failingSince))
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      disable: (endpointId, reason, now) =>
        db
          .update(endpoints)
          .set({
            disabledAt: date(now),
            disabledReason: reason,
            status: "disabled",
            updatedAt: date(now),
          })
          .where(
            and(eq(endpoints.id, endpointId), eq(endpoints.status, "enabled"))
          )
          .returning({ id: endpoints.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      findIn: (workspaceId, endpointId) =>
        db
          .select()
          .from(endpoints)
          .where(byId(workspaceId, endpointId))
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      get: (endpointId) =>
        db
          .select()
          .from(endpoints)
          .where(eq(endpoints.id, endpointId))
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      insert: (endpoint, secret) =>
        db
          .insert(endpoints)
          .values({
            ...settingsOf(endpoint),
            createdAt: date(endpoint.createdAt),
            id: endpoint.id,
            secret,
            workspaceId: endpoint.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      list: (workspaceId) =>
        db
          .select()
          .from(endpoints)
          .where(eq(endpoints.workspaceId, workspaceId))
          .orderBy(asc(endpoints.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toEndpoint))
          ),
      markFailing: (endpointId, now) =>
        db
          .update(endpoints)
          .set({
            failingSince: sql`COALESCE(${endpoints.failingSince}, ${date(now).toISOString()}::timestamptz)`,
          })
          .where(
            and(eq(endpoints.id, endpointId), eq(endpoints.status, "enabled"))
          )
          .returning({ failingSince: endpoints.failingSince })
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => utc(row?.failingSince ?? null))
          ),
      remove: (workspaceId, endpointId) =>
        db
          .delete(endpoints)
          .where(byId(workspaceId, endpointId))
          .returning({ id: endpoints.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      rotate: (endpoint, secret) =>
        db
          .update(endpoints)
          .set({
            previousSecret: endpoints.secret,
            previousSecretExpiresAt: endpoint.previousSecretExpiresAt.pipe(
              Option.map(date),
              Option.getOrNull
            ),
            secret,
            updatedAt: date(endpoint.updatedAt),
          })
          .where(byId(endpoint.workspaceId, endpoint.id))
          .returning({ id: endpoints.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      secrets: (endpointId) =>
        db
          .select({
            current: endpoints.secret,
            previous: endpoints.previousSecret,
          })
          .from(endpoints)
          .where(eq(endpoints.id, endpointId))
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) =>
              Option.fromUndefinedOr(row).pipe(
                Option.map(({ current, previous }): StoredSecrets => ({
                  current: SealedSecretSchema.make(current),
                  previous: Option.fromNullOr(previous).pipe(
                    Option.map((sealed) => SealedSecretSchema.make(sealed))
                  ),
                }))
              )
            )
          ),
      update: (endpoint) =>
        db
          .update(endpoints)
          .set(settingsOf(endpoint))
          .where(byId(endpoint.workspaceId, endpoint.id))
          .returning({ id: endpoints.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
    });
  })
);
