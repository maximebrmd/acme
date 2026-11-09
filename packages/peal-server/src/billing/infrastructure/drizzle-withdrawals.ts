import { eq } from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import { Withdrawals } from "#billing/application/ports/withdrawals.ts";
import type { Withdrawal } from "#billing/application/ports/withdrawals.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { withdrawals } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeUserId = Schema.decodeUnknownEffect(UserIdSchema);

/** Withdrawals in the billing schema, one per subscription. */
export const DrizzleWithdrawalsLive = Layer.effect(
  Withdrawals,
  Effect.gen(function* DrizzleWithdrawalsLive() {
    const db = yield* Drizzle;

    const record = Effect.fn("Withdrawals.record")(function* record(
      withdrawal: Withdrawal
    ) {
      yield* db
        .insert(withdrawals)
        .values({
          currency: withdrawal.refunded.currency,
          refunded: withdrawal.refunded.amount,
          requestedAt: DateTime.toDateUtc(withdrawal.requestedAt),
          stripeSubscriptionId: withdrawal.stripeSubscriptionId,
          userId: withdrawal.userId,
          workspaceId: withdrawal.workspaceId,
        })
        .onConflictDoNothing()
        .pipe(Effect.mapError(failed));

      const [row] = yield* db
        .select()
        .from(withdrawals)
        .where(
          eq(withdrawals.stripeSubscriptionId, withdrawal.stripeSubscriptionId)
        )
        .pipe(Effect.mapError(failed));

      if (row === undefined) {
        return withdrawal;
      }

      const stored: Withdrawal = {
        refunded: { amount: row.refunded, currency: row.currency },
        requestedAt: DateTime.fromDateUnsafe(row.requestedAt),
        stripeSubscriptionId: row.stripeSubscriptionId,
        userId:
          row.userId === null
            ? withdrawal.userId
            : yield* decodeUserId(row.userId).pipe(Effect.orDie),
        workspaceId: withdrawal.workspaceId,
      };

      return stored;
    });

    return Withdrawals.of({ record });
  })
);
