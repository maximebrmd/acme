import { asc, eq, lt } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { ContractRecords } from "#billing/application/ports/contract-records.ts";
import type {
  MadeWithdrawal,
  PlacedOrder,
} from "#billing/application/ports/contract-records.ts";
import { BillingIntervalSchema } from "#billing/domain/billing-interval.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { creditProblems, orders, withdrawals } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const instantOf = (value: Date | null) =>
  Option.fromNullOr(value).pipe(
    Option.map((found) => DateTime.fromDateUnsafe(found))
  );

const decodeWorkspace = (value: string | null) =>
  Option.fromNullOr(value).pipe(
    Option.flatMap(Schema.decodeUnknownOption(WorkspaceIdSchema))
  );

const decodeInterval = Schema.decodeUnknownEffect(BillingIntervalSchema);

const decodePlan = Schema.decodeUnknownEffect(PaidPlanSchema);

/** Orders and withdrawals in the billing schema. */
export const DrizzleContractRecordsLive = Layer.effect(
  ContractRecords,
  Effect.gen(function* DrizzleContractRecordsLive() {
    const db = yield* Drizzle;

    const ofUser = (userId: UserId) =>
      Effect.gen(function* ofUserRows() {
        const placed = yield* db
          .select()
          .from(orders)
          .where(eq(orders.userId, userId))
          .orderBy(asc(orders.createdAt), asc(orders.id));

        const made = yield* db
          .select()
          .from(withdrawals)
          .where(eq(withdrawals.userId, userId))
          .orderBy(asc(withdrawals.requestedAt));

        const exportedOrders = yield* Effect.all(
          placed.map((row) =>
            Effect.all({
              interval: decodeInterval(row.interval),
              plan: decodePlan(row.plan),
            }).pipe(
              Effect.orDie,
              Effect.map(({ interval, plan }): PlacedOrder => ({
                consentVersion: row.consentVersion,
                createdAt: DateTime.fromDateUnsafe(row.createdAt),
                interval,
                plan,
                trial: row.trial,
                usedAt: instantOf(row.usedAt),
                workspaceId: decodeWorkspace(row.workspaceId),
              }))
            )
          )
        );

        const exportedWithdrawals = made.map((row): MadeWithdrawal => ({
          refunded: { amount: row.refunded, currency: row.currency },
          requestedAt: DateTime.fromDateUnsafe(row.requestedAt),
          workspaceId: decodeWorkspace(row.workspaceId),
        }));

        return { orders: exportedOrders, withdrawals: exportedWithdrawals };
      }).pipe(
        Effect.mapError(failed),
        Effect.withSpan("ContractRecords.ofUser")
      );

    const purge = (before: DateTime.Utc) =>
      Effect.gen(function* purgeErased() {
        const cutoff = DateTime.toDateUtc(before);

        const purgedOrders = yield* db
          .delete(orders)
          .where(lt(orders.erasedAt, cutoff))
          .returning({ id: orders.id });

        const purgedWithdrawals = yield* db
          .delete(withdrawals)
          .where(lt(withdrawals.erasedAt, cutoff))
          .returning({ id: withdrawals.stripeSubscriptionId });

        const purgedProblems = yield* db
          .delete(creditProblems)
          .where(lt(creditProblems.erasedAt, cutoff))
          .returning({ key: creditProblems.key });

        return (
          purgedOrders.length + purgedWithdrawals.length + purgedProblems.length
        );
      }).pipe(
        Effect.mapError(failed),
        Effect.withSpan("ContractRecords.purge")
      );

    return ContractRecords.of({ ofUser, purge });
  })
);
