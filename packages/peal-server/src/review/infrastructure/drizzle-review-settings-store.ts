import { eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { ReviewSettingsStore } from "#review/application/ports/review-settings-store.ts";
import { ApprovalPolicySchema } from "#review/domain/approval-policy.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, failed } from "./rows.ts";
import { settings } from "./schema.ts";

const decodePolicy = Schema.decodeUnknownEffect(ApprovalPolicySchema);

/** Workspaces' approval policies in the review schema. */
export const DrizzleReviewSettingsStore = Layer.effect(
  ReviewSettingsStore,
  Effect.gen(function* DrizzleReviewSettingsStore() {
    const db = yield* Drizzle;

    return ReviewSettingsStore.of({
      policy: (workspaceId) =>
        db
          .select({ policy: settings.approvalPolicy })
          .from(settings)
          .where(eq(settings.workspaceId, workspaceId))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeedNone
                : decodePolicy(row.policy).pipe(
                    Effect.map(Option.some),
                    Effect.orDie
                  )
            )
          ),
      setPolicy: ({ at, by, policy, workspaceId }) => {
        const chosen = {
          approvalPolicy: policy,
          updatedAt: date(at),
          updatedBy: Option.getOrNull(by),
        };

        return db
          .insert(settings)
          .values({ ...chosen, workspaceId })
          .onConflictDoUpdate({ set: chosen, target: settings.workspaceId })
          .pipe(Effect.mapError(failed), Effect.asVoid);
      },
    });
  })
);
