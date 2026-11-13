import { and, eq, inArray } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { ActiveAdMonths } from "#ads/application/ports/active-ad-months.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { activeAdMonths } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * The managed ads counted each month, in the ads schema: recording one is
 * an insert that does nothing when the ad was counted, so two syncs never
 * count it twice.
 */
export const DrizzleActiveAdMonths = Layer.effect(
  ActiveAdMonths,
  Effect.gen(function* DrizzleActiveAdMonths() {
    const db = yield* Drizzle;

    const unseen = (
      workspaceId: WorkspaceId,
      month: DateTime.Utc,
      adExternalIds: readonly string[]
    ) =>
      adExternalIds.length === 0
        ? Effect.succeed([])
        : db
            .select({ id: activeAdMonths.adExternalId })
            .from(activeAdMonths)
            .where(
              and(
                eq(activeAdMonths.workspaceId, workspaceId),
                eq(activeAdMonths.month, DateTime.toDateUtc(month)),
                inArray(activeAdMonths.adExternalId, [...adExternalIds])
              )
            )
            .pipe(
              Effect.map((rows) => {
                const seen = new Set(rows.map(({ id }) => id));

                return [...new Set(adExternalIds)].filter(
                  (id) => !seen.has(id)
                );
              }),
              Effect.mapError(failed),
              Effect.withSpan("ActiveAdMonths.unseen")
            );

    const record = (
      workspaceId: WorkspaceId,
      month: DateTime.Utc,
      adExternalId: string
    ) =>
      db
        .insert(activeAdMonths)
        .values({
          adExternalId,
          month: DateTime.toDateUtc(month),
          workspaceId,
        })
        .onConflictDoNothing()
        .returning({ id: activeAdMonths.adExternalId })
        .pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.mapError(failed),
          Effect.withSpan("ActiveAdMonths.record")
        );

    return ActiveAdMonths.of({ record, unseen });
  })
);
