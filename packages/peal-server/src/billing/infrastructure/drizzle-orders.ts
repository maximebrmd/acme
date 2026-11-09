import { and, eq, gt, isNull } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { Orders } from "#billing/application/ports/orders.ts";
import type { OrderClaim } from "#billing/application/ports/orders.ts";
import { Order } from "#billing/domain/order.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { orders } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeOrder = Schema.decodeUnknownEffect(Order);

/**
 * Orders in the billing schema. Taking one is a single conditional update,
 * so two checkouts started together never take the same order.
 */
export const DrizzleOrdersLive = Layer.effect(
  Orders,
  Effect.gen(function* DrizzleOrdersLive() {
    const db = yield* Drizzle;

    const place = (order: Order) =>
      db
        .insert(orders)
        .values({
          consentVersion: order.consentVersion,
          createdAt: DateTime.toDateUtc(order.createdAt),
          id: order.id,
          interval: order.interval,
          plan: order.plan,
          trial: order.trial,
          userId: order.userId,
          workspaceId: order.workspaceId,
        })
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("Orders.place")
        );

    const take = (claim: OrderClaim, since: DateTime.Utc, now: DateTime.Utc) =>
      db
        .update(orders)
        .set({ usedAt: DateTime.toDateUtc(now) })
        .where(
          and(
            eq(orders.id, claim.id),
            eq(orders.userId, claim.userId),
            eq(orders.workspaceId, claim.workspaceId),
            eq(orders.plan, claim.plan),
            eq(orders.interval, claim.interval),
            isNull(orders.usedAt),
            gt(orders.createdAt, DateTime.toDateUtc(since))
          )
        )
        .returning()
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(([row]) =>
            row === undefined
              ? Effect.succeed(Option.none<Order>())
              : decodeOrder({
                  ...row,
                  createdAt: DateTime.fromDateUnsafe(row.createdAt),
                }).pipe(Effect.orDie, Effect.map(Option.some))
          ),
          Effect.withSpan("Orders.take")
        );

    return Orders.of({ place, take });
  })
);
