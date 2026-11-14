import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { PlanRetirements } from "#billing/application/ports/plan-retirements.ts";
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
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  creditProblems,
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
    cancelAt: instantOf(row.cancelAt),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    currentPeriodEnd: instantOf(row.currentPeriodEnd),
    currentPeriodStart: instantOf(row.currentPeriodStart),
    interval: row.interval,
    paidInvoiceAt: instantOf(row.paidInvoiceAt),
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

    const ofWorkspaces = (workspaceIds: readonly WorkspaceId[]) =>
      workspaceIds.length === 0
        ? Effect.succeed(new Map<WorkspaceId, readonly Subscription[]>())
        : db
            .select()
            .from(subscriptions)
            .where(anyUuid(subscriptions.workspaceId, workspaceIds))
            .orderBy(asc(subscriptions.stripeSubscriptionId))
            .pipe(
              Effect.mapError(failed),
              Effect.flatMap((rows) =>
                Effect.all(rows.map((row) => toSubscription(row)))
              ),
              Effect.map((found) => {
                const of = new Map<WorkspaceId, Subscription[]>();

                for (const subscription of found) {
                  const held = of.get(subscription.workspaceId) ?? [];

                  held.push(subscription);
                  of.set(subscription.workspaceId, held);
                }

                return of;
              }),
              Effect.withSpan("Subscriptions.ofWorkspaces")
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
      Effect.gen(function* eraseWorkspaceRows() {
        const erasedAt = date(yield* DateTime.now);

        // The customer whose invoices the kept orders go with.
        const [billed] = yield* db
          .select({ customer: subscriptions.stripeCustomerId })
          .from(subscriptions)
          .where(eq(subscriptions.workspaceId, workspaceId))
          .orderBy(asc(subscriptions.stripeSubscriptionId))
          .limit(1);

        yield* billed === undefined
          ? db.delete(orders).where(eq(orders.workspaceId, workspaceId))
          : db
              .update(orders)
              .set({
                erasedAt,
                stripeCustomerId: billed.customer,
                workspaceId: null,
              })
              .where(eq(orders.workspaceId, workspaceId));

        yield* db
          .update(withdrawals)
          .set({ erasedAt, workspaceId: null })
          .where(eq(withdrawals.workspaceId, workspaceId));

        // What Peal still owes stays for staff, by its Stripe ids.
        yield* db
          .update(creditProblems)
          .set({ erasedAt, workspaceId: null })
          .where(eq(creditProblems.workspaceId, workspaceId));

        yield* db
          .delete(subscriptions)
          .where(eq(subscriptions.workspaceId, workspaceId));

        yield* db
          .update(trials)
          .set({ workspaceId: null })
          .where(eq(trials.workspaceId, workspaceId));

        yield* db
          .delete(trials)
          .where(
            and(
              isNull(trials.userId),
              isNull(trials.workspaceId),
              isNull(trials.userPseudonym)
            )
          );
      }).pipe(
        Effect.mapError(failed),
        Effect.withSpan("Subscriptions.eraseWorkspace")
      );

    const forgetUser = (userId: UserId, pseudonym: string) =>
      Effect.all([
        db
          .update(orders)
          .set({ userId: null })
          .where(eq(orders.userId, userId)),
        db
          .update(withdrawals)
          .set({ userId: null })
          .where(eq(withdrawals.userId, userId)),
        DateTime.now.pipe(
          Effect.flatMap((now) =>
            db
              .update(trials)
              .set({
                forgottenAt: date(now),
                userId: null,
                userPseudonym: pseudonym,
              })
              .where(
                and(
                  eq(trials.userId, userId),
                  isNotNull(trials.stripeSubscriptionId)
                )
              )
          )
        ),
        // A hold no checkout took is no trial.
        db
          .delete(trials)
          .where(
            and(eq(trials.userId, userId), isNull(trials.stripeSubscriptionId))
          ),
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
        cancelAt: dateOf(subscription.cancelAt),
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
            cancelAt: sql`excluded.cancel_at`,
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

    const perAccount = (after: Option.Option<string>, limit: number) =>
      db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.plan, "payAsYouGo"),
            notInArray(subscriptions.status, [
              "canceled",
              "incomplete",
              "incomplete_expired",
            ]),
            after.pipe(
              Option.map((id) => gt(subscriptions.stripeSubscriptionId, id)),
              Option.getOrUndefined
            )
          )
        )
        .orderBy(asc(subscriptions.stripeSubscriptionId))
        .limit(limit)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) =>
            Effect.all(rows.map((row) => toSubscription(row)))
          ),
          Effect.withSpan("Subscriptions.perAccount")
        );

    const markPaidInvoice = (subscriptionId: string, at: DateTime.Utc) =>
      db
        .update(subscriptions)
        .set({ paidInvoiceAt: date(at) })
        .where(
          and(
            eq(subscriptions.stripeSubscriptionId, subscriptionId),
            isNull(subscriptions.paidInvoiceAt)
          )
        )
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("Subscriptions.markPaidInvoice")
        );

    const record = (change: SubscriptionChange) =>
      client
        .withTransaction(save(change))
        .pipe(Effect.mapError(failed), Effect.withSpan("Subscriptions.record"));

    return Subscriptions.of({
      eraseWorkspace,
      forgetUser,
      markPaidInvoice,
      ofWorkspace,
      ofWorkspaces,
      perAccount,
      record,
      remindable,
    });
  })
);

// The plans retired, as `billing:retire-plans` reads them: every legacy
// plan but the free one, on a subscription that may still give it.
const retiring = and(
  notInArray(subscriptions.plan, ["payAsYouGo", "free"]),
  inArray(subscriptions.status, ["active", "past_due", "trialing"])
);

const retiringOf = (row: Row) =>
  toSubscription(row).pipe(
    Effect.map((subscription) => ({
      paidUntil: instantOf(row.retirementPaidUntil),
      requestedFor: instantOf(row.retirementRequestedFor),
      retiredAt: instantOf(row.retiredAt),
      retiresAt: instantOf(row.retiresAt),
      subscription,
      toldAt: instantOf(row.retirementToldAt),
    }))
  );

/** The retirement of the legacy plans, on their subscriptions' rows. */
export const DrizzlePlanRetirementsLive = Layer.effect(
  PlanRetirements,
  Effect.gen(function* DrizzlePlanRetirementsLive() {
    const db = yield* Drizzle;

    const read = (where: ReturnType<typeof and>) =>
      db
        .select()
        .from(subscriptions)
        .where(where)
        .orderBy(asc(subscriptions.stripeSubscriptionId))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap((rows) => Effect.all(rows.map(retiringOf)))
        );

    return PlanRetirements.of({
      legacy: read(retiring).pipe(Effect.withSpan("PlanRetirements.legacy")),
      request: (subscriptionId, requestedFor, paidUntil, at) =>
        db
          .update(subscriptions)
          .set({
            retiredAt: sql`coalesce(${subscriptions.retiredAt}, ${date(at)})`,
            retirementPaidUntil: sql`coalesce(${subscriptions.retirementPaidUntil}, ${dateOf(paidUntil)})`,
            retirementRequestedFor: date(requestedFor),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      retire: (subscriptionId, retiresAt, at) =>
        db
          .update(subscriptions)
          .set({
            retiredAt: sql`coalesce(${subscriptions.retiredAt}, ${date(at)})`,
            retirementRequestedFor: date(retiresAt),
            retiresAt: date(retiresAt),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      retiresAt: (subscriptionId) =>
        db
          .select({ retiresAt: subscriptions.retiresAt })
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => instantOf(row?.retiresAt ?? null))
          ),
      told: (subscriptionId, at) =>
        db
          .update(subscriptions)
          .set({ retirementToldAt: date(at) })
          .where(
            and(
              eq(subscriptions.stripeSubscriptionId, subscriptionId),
              isNull(subscriptions.retirementToldAt)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      unconfirmed: read(
        and(
          retiring,
          isNotNull(subscriptions.retirementRequestedFor),
          isNull(subscriptions.retiresAt)
        )
      ).pipe(Effect.withSpan("PlanRetirements.unconfirmed")),
      untold: read(
        and(
          retiring,
          isNotNull(subscriptions.retiresAt),
          isNull(subscriptions.retirementToldAt)
        )
      ).pipe(Effect.withSpan("PlanRetirements.untold")),
    });
  })
);
