import { asc, eq, lt, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import type { RecordOutcome } from "#billing/application/ports/subscriptions.ts";
import type { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import { lifecycleStage, Subscription } from "#billing/domain/subscription.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { stripeEvents, subscriptions } from "./schema.ts";

type Row = typeof subscriptions.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written fails loudly instead of being trusted.
const decodeSubscription = Schema.decodeUnknownEffect(Subscription);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

// The stage of the status a row holds, as `lifecycleStage` orders them; a
// status the domain does not know yields to any event.
const storedStage = sql`case ${subscriptions.status} ${sql.join(
  Object.entries(lifecycleStage).map(
    ([status, stage]) => sql`when ${status} then ${stage}::integer`
  ),
  sql` `
)} else 0 end`;

const toSubscription = (row: Row) =>
  decodeSubscription({
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    currentPeriodEnd: Option.fromNullOr(row.currentPeriodEnd).pipe(
      Option.map((end) => DateTime.fromDateUnsafe(end))
    ),
    plan: row.plan,
    status: row.status,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

/**
 * Subscriptions in the billing schema. Recording takes one transaction: the
 * event's id first, which a delivery of the same event running at once
 * waits on and then finds, then the subscription, written only over an
 * older event's, or one of the same second that is not further along.
 */
export const DrizzleSubscriptionsLive = Layer.effect(
  Subscriptions,
  Effect.gen(function* DrizzleSubscriptionsLive() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const ofWorkspace = (workspaceId: WorkspaceId) =>
      db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.workspaceId, workspaceId))
        .orderBy(asc(subscriptions.stripeSubscriptionId))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) =>
            Effect.all(rows.map((row) => toSubscription(row)))
          ),
          Effect.withSpan("Subscriptions.ofWorkspace")
        );

    const save = Effect.fn("Subscriptions.save")(function* save(
      change: SubscriptionChange
    ) {
      const now = yield* DateTime.now;
      const { subscription } = change;

      const values = {
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd.pipe(
          Option.map(date),
          Option.getOrNull
        ),
        lastEventAt: date(change.occurredAt),
        lastEventId: change.eventId,
        plan: subscription.plan,
        status: subscription.status,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        updatedAt: date(now),
        workspaceId: subscription.workspaceId,
      };

      const fresh = yield* db
        .insert(stripeEvents)
        .values({ id: change.eventId, receivedAt: date(now) })
        .onConflictDoNothing()
        .returning({ id: stripeEvents.id });

      if (fresh.length === 0) {
        const duplicate: RecordOutcome = "duplicate";

        return duplicate;
      }

      // A later event wins. Of two events of the same second, the one
      // further along the subscription's life wins (`lifecycleStage`), and
      // otherwise the one that arrives last.
      const later = lt(subscriptions.lastEventAt, values.lastEventAt);
      const sameSecond = eq(subscriptions.lastEventAt, values.lastEventAt);
      const notBehind = sql`${storedStage} <= ${lifecycleStage[subscription.status]}`;

      const written = yield* db
        .insert(subscriptions)
        .values(values)
        .onConflictDoUpdate({
          set: {
            cancelAtPeriodEnd: sql`excluded.cancel_at_period_end`,
            currentPeriodEnd: sql`excluded.current_period_end`,
            lastEventAt: sql`excluded.last_event_at`,
            lastEventId: sql`excluded.last_event_id`,
            plan: sql`excluded.plan`,
            status: sql`excluded.status`,
            stripeCustomerId: sql`excluded.stripe_customer_id`,
            updatedAt: sql`excluded.updated_at`,
            workspaceId: sql`excluded.workspace_id`,
          },
          setWhere: sql`${later} or (${sameSecond} and ${notBehind})`,
          target: subscriptions.stripeSubscriptionId,
        })
        .returning({ id: subscriptions.stripeSubscriptionId });

      const outcome: RecordOutcome = written.length > 0 ? "recorded" : "stale";

      return outcome;
    });

    const record = (change: SubscriptionChange) =>
      client
        .withTransaction(save(change))
        .pipe(Effect.mapError(failed), Effect.withSpan("Subscriptions.record"));

    return Subscriptions.of({ ofWorkspace, record });
  })
);
