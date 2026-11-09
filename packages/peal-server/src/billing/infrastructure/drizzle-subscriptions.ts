import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import type { RecordOutcome } from "#billing/application/ports/subscriptions.ts";
import {
  renewalNotice,
  startedNotice,
  trialNotice,
} from "#billing/domain/reminders.ts";
import type { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import { lifecycleStage, Subscription } from "#billing/domain/subscription.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  orders,
  stripeEvents,
  subscriptions,
  trials,
  withdrawals,
} from "./schema.ts";

type Row = typeof subscriptions.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written fails loudly instead of being trusted.
const decodeSubscription = Schema.decodeUnknownEffect(Subscription);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const instantOf = (value: Date | null) =>
  Option.fromNullOr(value).pipe(
    Option.map((found) => DateTime.fromDateUnsafe(found))
  );

const dateOf = (instant: Option.Option<DateTime.Utc>) =>
  instant.pipe(Option.map(date), Option.getOrNull);

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
    currentPeriodEnd: instantOf(row.currentPeriodEnd),
    currentPeriodStart: instantOf(row.currentPeriodStart),
    interval: row.interval,
    plan: row.plan,
    startedAt: instantOf(row.startedAt),
    status: row.status,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    trialEnd: instantOf(row.trialEnd),
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

    const remindable = (now: DateTime.Utc) =>
      db
        .select()
        .from(subscriptions)
        .where(
          or(
            and(
              inArray(subscriptions.status, ["active", "trialing"]),
              gt(
                subscriptions.startedAt,
                date(DateTime.subtractDuration(now, startedNotice))
              ),
              lte(subscriptions.startedAt, date(now))
            ),
            and(
              eq(subscriptions.status, "trialing"),
              gt(subscriptions.trialEnd, date(now)),
              lte(
                subscriptions.trialEnd,
                date(DateTime.addDuration(now, trialNotice))
              )
            ),
            and(
              inArray(subscriptions.status, ["active"]),
              eq(subscriptions.interval, "year"),
              gt(subscriptions.currentPeriodEnd, date(now)),
              lte(
                subscriptions.currentPeriodEnd,
                date(DateTime.addDuration(now, renewalNotice))
              )
            )
          )
        )
        .orderBy(asc(subscriptions.stripeSubscriptionId))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) =>
            Effect.all(rows.map((row) => toSubscription(row)))
          ),
          Effect.withSpan("Subscriptions.remindable")
        );

    const eraseWorkspace = (workspaceId: WorkspaceId) =>
      Effect.all([
        db
          .delete(subscriptions)
          .where(eq(subscriptions.workspaceId, workspaceId)),
        db.delete(orders).where(eq(orders.workspaceId, workspaceId)),
        db.delete(withdrawals).where(eq(withdrawals.workspaceId, workspaceId)),
        db
          .update(trials)
          .set({ workspaceId: null })
          .where(eq(trials.workspaceId, workspaceId)),
        db
          .delete(trials)
          .where(and(isNull(trials.userId), isNull(trials.workspaceId))),
      ]).pipe(
        Effect.mapError(failed),
        Effect.asVoid,
        Effect.withSpan("Subscriptions.eraseWorkspace")
      );

    const forgetUser = (userId: UserId) =>
      Effect.all([
        db
          .update(orders)
          .set({ userId: null })
          .where(eq(orders.userId, userId)),
        db
          .update(withdrawals)
          .set({ userId: null })
          .where(eq(withdrawals.userId, userId)),
        db
          .update(trials)
          .set({ userId: null })
          .where(eq(trials.userId, userId)),
        db
          .delete(trials)
          .where(and(isNull(trials.userId), isNull(trials.workspaceId))),
      ]).pipe(
        Effect.mapError(failed),
        Effect.asVoid,
        Effect.withSpan("Subscriptions.forgetUser")
      );

    const save = Effect.fn("Subscriptions.save")(function* save(
      change: SubscriptionChange
    ) {
      const now = yield* DateTime.now;
      const { subscription } = change;

      const values = {
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: dateOf(subscription.currentPeriodEnd),
        currentPeriodStart: dateOf(subscription.currentPeriodStart),
        interval: subscription.interval,
        lastEventAt: date(change.occurredAt),
        lastEventId: change.eventId,
        plan: subscription.plan,
        startedAt: dateOf(subscription.startedAt),
        status: subscription.status,
        stripeCustomerId: subscription.stripeCustomerId,
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        trialEnd: dateOf(subscription.trialEnd),
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
            currentPeriodStart: sql`excluded.current_period_start`,
            interval: sql`excluded.interval`,
            lastEventAt: sql`excluded.last_event_at`,
            lastEventId: sql`excluded.last_event_id`,
            plan: sql`excluded.plan`,
            startedAt: sql`excluded.started_at`,
            status: sql`excluded.status`,
            stripeCustomerId: sql`excluded.stripe_customer_id`,
            trialEnd: sql`excluded.trial_end`,
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

    return Subscriptions.of({
      eraseWorkspace,
      forgetUser,
      ofWorkspace,
      record,
      remindable,
    });
  })
);
