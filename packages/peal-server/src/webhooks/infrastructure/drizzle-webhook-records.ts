import { asc, eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { WebhookRecords } from "#webhooks/application/webhook-records.ts";

import { deliveries, endpoints, events, manualSends } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

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
              id: endpoints.id,
              status: endpoints.status,
              url: endpoints.url,
            })
            .from(endpoints)
            .where(eq(endpoints.workspaceId, workspaceId))
            .orderBy(asc(endpoints.id))
            .pipe(Effect.mapError(failed));

          return rows.map(({ status, ...row }) => ({
            ...row,
            createdAt: DateTime.fromDateUnsafe(row.createdAt),
            enabled: status === "enabled",
          }));
        }
      ),
    });
  })
);
