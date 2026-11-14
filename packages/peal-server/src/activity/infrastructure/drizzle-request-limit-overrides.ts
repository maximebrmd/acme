import { eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { RequestLimitOverrides } from "#activity/application/request-limit-overrides.ts";
import type { RequestLimitOverride } from "#activity/application/request-limit-overrides.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { requestLimits } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/** Staff's overrides of the rate limit, in `activity.request_limits`. */
export const DrizzleRequestLimitOverrides = Layer.effect(
  RequestLimitOverrides,
  Effect.gen(function* DrizzleRequestLimitOverrides() {
    const db = yield* Drizzle;

    return RequestLimitOverrides.of({
      of: Effect.fn("RequestLimitOverrides.of")(function* of(workspaceIds) {
        if (workspaceIds.length === 0) {
          return new Map();
        }

        const rows = yield* db
          .select()
          .from(requestLimits)
          .where(anyUuid(requestLimits.workspaceId, workspaceIds))
          .pipe(Effect.mapError(failed));

        return new Map(
          rows.map(
            (
              row
            ): [RequestLimitOverride["workspaceId"], RequestLimitOverride] => {
              const workspaceId = WorkspaceIdSchema.make(row.workspaceId);

              return [
                workspaceId,
                {
                  requestsPerMinute: row.requestsPerMinute,
                  setAt: DateTime.fromDateUnsafe(row.setAt),
                  workspaceId,
                },
              ];
            }
          )
        );
      }),
      remove: (workspaceId) =>
        db
          .delete(requestLimits)
          .where(eq(requestLimits.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      set: (workspaceId, requestsPerMinute, at) =>
        db
          .insert(requestLimits)
          .values({
            requestsPerMinute,
            setAt: DateTime.toDateUtc(at),
            workspaceId,
          })
          .onConflictDoUpdate({
            set: { requestsPerMinute, setAt: DateTime.toDateUtc(at) },
            target: requestLimits.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
