import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { WebhookRecords } from "#webhooks/application/webhook-records.ts";
import { SealedHeaderSchema } from "#webhooks/domain/endpoint-headers.ts";

import { deliveries, endpoints, events, manualSends } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeNames = Schema.decodeUnknownEffect(
  Schema.Array(Schema.Struct({ name: SealedHeaderSchema.fields.name }))
);

/** WebhookRecords on the webhooks schema. */
export const DrizzleWebhookRecords = Layer.effect(
  WebhookRecords,
  Effect.gen(function* DrizzleWebhookRecords() {
    const db = yield* Drizzle;

    return WebhookRecords.of({
      eraseWorkspace: Effect.fn("WebhookRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          yield* db
            .delete(deliveries)
            .where(eq(deliveries.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));

          yield* db
            .delete(events)
            .where(eq(events.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));

          yield* db
            .delete(manualSends)
            .where(eq(manualSends.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));

          // With them go their secrets, encrypted.
          yield* db
            .delete(endpoints)
            .where(eq(endpoints.workspaceId, workspaceId))
            .pipe(Effect.mapError(failed));
        }
      ),
      exportWorkspace: Effect.fn("WebhookRecords.exportWorkspace")(
        function* exportWorkspace(workspaceId) {
          const rows = yield* db
            .select({
              createdAt: endpoints.createdAt,
              description: endpoints.description,
              eventTypes: endpoints.eventTypes,
              headers: endpoints.headers,
              id: endpoints.id,
              status: endpoints.status,
              url: endpoints.url,
            })
            .from(endpoints)
            .where(eq(endpoints.workspaceId, workspaceId))
            .orderBy(asc(endpoints.id))
            .pipe(Effect.mapError(failed));

          // Names only: the values are the receivers' secrets.
          return yield* Effect.all(
            rows.map(({ headers, status, ...row }) =>
              decodeNames(headers).pipe(
                Effect.orDie,
                Effect.map((named) => ({
                  ...row,
                  createdAt: DateTime.fromDateUnsafe(row.createdAt),
                  enabled: status === "enabled",
                  headerNames: named.map(({ name }) => name),
                }))
              )
            )
          );
        }
      ),
    });
  })
);
