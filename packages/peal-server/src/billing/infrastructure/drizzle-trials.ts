import { eq, or } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { Trials } from "#billing/application/ports/trials.ts";
import type { StartedTrial } from "#billing/application/ports/trials.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { trials } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * Trials in the billing schema, unique by account and by workspace: a
 * second one of either is not recorded.
 */
export const DrizzleTrialsLive = Layer.effect(
  Trials,
  Effect.gen(function* DrizzleTrialsLive() {
    const db = yield* Drizzle;

    const used = (userId: UserId, workspaceId: WorkspaceId) =>
      db
        .select({ id: trials.stripeSubscriptionId })
        .from(trials)
        .where(
          or(eq(trials.userId, userId), eq(trials.workspaceId, workspaceId))
        )
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.map((rows) => rows.length > 0),
          Effect.withSpan("Trials.used")
        );

    const record = (trial: StartedTrial) =>
      db
        .insert(trials)
        .values({
          plan: trial.plan,
          startedAt: DateTime.toDateUtc(trial.startedAt),
          stripeSubscriptionId: trial.stripeSubscriptionId,
          userId: trial.userId,
          workspaceId: trial.workspaceId,
        })
        .onConflictDoNothing()
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("Trials.record")
        );

    return Trials.of({ record, used });
  })
);
