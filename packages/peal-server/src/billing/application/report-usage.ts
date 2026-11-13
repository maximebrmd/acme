import { Context, DateTime, Effect, Layer, Metric, Option } from "effect";

import { stampOf } from "#billing/domain/account-days.ts";
import { entitles } from "#billing/domain/subscription.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { AccountDayStore } from "./ports/account-day-store.ts";
import type { MeterReport } from "./ports/account-day-store.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { UsageBilling } from "./ports/usage-billing.ts";

/** How many reports one page of the reporter reads. */
export const reportBatchSize = 500;

/** How many customers' reports are sent at once, each in its order. */
export const reportConcurrency = 8;

/**
 * Reports waiting when the last run ended. An alert rule reads it, with
 * the age of the oldest (peal-usage-report-behind).
 */
export const reportsLeft = Metric.gauge("peal.billing.usage_report.left", {
  description:
    "Meter events in the outbox to Stripe not sent when the reporter's last run ended",
});

/** The age of the oldest report waiting, in seconds, when the run ended. */
export const oldestReportAge = Metric.gauge(
  "peal.billing.usage_report.oldest_age",
  {
    description:
      "Seconds since the oldest meter event not sent to Stripe was written, when the reporter's last run ended",
  }
);

/**
 * When the reporter last ended a run, in seconds since the epoch: an alert
 * rule reads it, so a reporter that stopped running is heard of
 * (peal-usage-report-stopped).
 */
export const reportedAt = Metric.gauge("peal.billing.usage_report.ran_at", {
  description:
    "When the reporter of usage to Stripe last ended a run, in seconds since the epoch",
});

/**
 * Meter events Stripe refused for good: usage that will not be billed
 * unless someone looks. An alert rule reads it (peal-usage-report-refused).
 */
export const reportsRefused = Metric.counter(
  "peal.billing.usage_report.refused",
  {
    description: "Meter events Stripe refused for good, kept unsent",
    incremental: true,
  }
);

/** What a run of the reporter did. */
export interface UsageReportRun {
  /** Reports Stripe did not take this run, left for the next. */
  readonly deferred: number;
  /** Reports still waiting when it ended, and the oldest's write. */
  readonly left: number;
  readonly oldest: Option.Option<DateTime.Utc>;
  readonly refused: number;
  readonly sent: number;
}

/** What the daily step did to the per-account subscriptions. */
export interface SubscriptionsKept {
  readonly failed: number;
  readonly itemsAdded: number;
  readonly itemsReplaced: number;
  /** Subscriptions whose first paid invoice was found today. */
  readonly paid: number;
  readonly subscriptions: number;
}

// What one subscription's keeping adds to the day's: none when Stripe
// did not answer.
const withOutcome = (
  kept: SubscriptionsKept,
  outcome: Option.Option<{
    readonly items: { readonly added: number; readonly replaced: number };
    readonly paid: boolean;
  }>
): SubscriptionsKept =>
  Option.match(outcome, {
    onNone: () => ({ ...kept, failed: kept.failed + 1 }),
    onSome: ({ items, paid }) => ({
      ...kept,
      itemsAdded: kept.itemsAdded + items.added,
      itemsReplaced: kept.itemsReplaced + items.replaced,
      paid: kept.paid + (paid ? 1 : 0),
    }),
  });

// Each customer's reports, in the order they were written.
const byCustomer = (
  reports: readonly MeterReport[]
): readonly (readonly MeterReport[])[] => {
  const grouped = new Map<string, MeterReport[]>();

  for (const report of reports) {
    const kept = grouped.get(report.stripeCustomerId);

    if (kept === undefined) {
      grouped.set(report.stripeCustomerId, [report]);
    } else {
      kept.push(report);
    }
  }

  return [...grouped.values()];
};

/**
 * Sends the outbox to Stripe: every report neither sent nor refused,
 * oldest first, by cursor, each customer's in the order they were written
 * and one at a time (Stripe takes one call at a time per customer and
 * meter), several customers at once. Each is stamped with the instant it
 * describes when that is within the last hour, else with the time it is
 * sent (`stampOf`). One Stripe did not take (no answer, a 429, a 5xx) is
 * left for the next run with the customer's later ones, so their order
 * holds; one Stripe refused for good keeps its code, is logged and
 * counted, and the customer's next ones go on. Then it says what it left.
 * Its daily step keeps every per-account subscription's items to the
 * catalogue, and, once the subscription's first paid invoice is found,
 * lifts the account ceiling and the billing threshold it had until then.
 */
export class ReportUsage extends Context.Service<
  ReportUsage,
  {
    readonly run: Effect.Effect<UsageReportRun, DatabaseError>;
    readonly daily: Effect.Effect<SubscriptionsKept, DatabaseError>;
  }
>()("peal-server/billing/application/ReportUsage") {
  static readonly make = (batchSize: number) =>
    Layer.effect(
      ReportUsage,
      Effect.gen(function* ReportUsageLive() {
        const store = yield* AccountDayStore;
        const billing = yield* UsageBilling;
        const subscriptions = yield* Subscriptions;
        const stripe = yield* StripeContracts;

        // One customer's reports, in order, until Stripe does not take
        // one: what was sent, what was refused, what waits.
        const sendAll = Effect.fn("ReportUsage.sendAll")(function* sendAll(
          reports: readonly MeterReport[]
        ) {
          const sent: string[] = [];
          let refused = 0;

          for (const [index, report] of reports.entries()) {
            const now = yield* DateTime.now;

            const outcome = yield* billing.report({
              eventName: report.eventName,
              identifier: report.identifier,
              stripeCustomerId: report.stripeCustomerId,
              timestamp: stampOf(report.occurredAt, now),
              value: report.value,
            });

            if (outcome._tag === "retry") {
              return {
                deferred: reports.length - index,
                refused,
                sent,
                stalled: true,
              };
            }

            if (outcome._tag === "sent") {
              sent.push(report.identifier);
            } else {
              refused += 1;

              yield* store.markRefused(report.identifier, outcome.code);
              yield* Metric.update(reportsRefused, 1);
              yield* Effect.logError(
                "Stripe refused a meter event for good: its usage is not billed"
              ).pipe(
                Effect.annotateLogs({
                  code: outcome.code,
                  eventName: report.eventName,
                  identifier: report.identifier,
                })
              );
            }
          }

          return { deferred: 0, refused, sent, stalled: false };
        });

        const send = Effect.fn("ReportUsage.send")(function* send() {
          let after = Option.none<{
            readonly createdAt: DateTime.Utc;
            readonly identifier: string;
          }>();

          let more = true;
          let sent = 0;
          let refused = 0;
          let deferred = 0;
          // A customer Stripe did not take one of is left to the next run,
          // its later reports with it, whatever page they are on.
          const stalled = new Set<string>();

          while (more) {
            const page = yield* store.unsent(after, batchSize);

            const groups = byCustomer(page);

            const waiting = groups.filter(
              ([first]) =>
                first !== undefined && stalled.has(first.stripeCustomerId)
            );

            const going = groups.filter((group) => !waiting.includes(group));

            const ended = yield* Effect.forEach(going, sendAll, {
              concurrency: reportConcurrency,
            });

            const identifiers = ended.flatMap((group) => group.sent);
            yield* store.markSent(identifiers, yield* DateTime.now);

            for (const [index, group] of ended.entries()) {
              const customer = going[index]?.[0]?.stripeCustomerId;

              if (group.stalled && customer !== undefined) {
                stalled.add(customer);
              }
            }

            sent += identifiers.length;
            refused += ended.reduce((sum, group) => sum + group.refused, 0);
            deferred +=
              ended.reduce((sum, group) => sum + group.deferred, 0) +
              waiting.reduce((sum, group) => sum + group.length, 0);

            const last = page.at(-1);

            more = page.length === batchSize;
            after = Option.fromUndefinedOr(last).pipe(
              Option.map(({ createdAt, identifier }) => ({
                createdAt,
                identifier,
              }))
            );
          }

          return { deferred, refused, sent };
        });

        const run = Effect.gen(function* run() {
          const done = yield* send();
          const { left, oldest } = yield* store.backlog;
          const now = yield* DateTime.now;

          yield* Metric.update(reportsLeft, left);
          yield* Metric.update(
            oldestReportAge,
            Option.match(oldest, {
              onNone: () => 0,
              onSome: (at) =>
                Math.max(
                  0,
                  Math.floor(
                    (DateTime.toEpochMillis(now) - DateTime.toEpochMillis(at)) /
                      1000
                  )
                ),
            })
          );
          yield* Metric.update(
            reportedAt,
            Math.floor(DateTime.toEpochMillis(now) / 1000)
          );

          const ran: UsageReportRun = { ...done, left, oldest };

          return ran;
        }).pipe(Effect.withSpan("ReportUsage.run"));

        // One subscription: its items, then its first paid invoice. What
        // Stripe does not answer is tried again tomorrow.
        const keep = Effect.fn("ReportUsage.keep")(function* keep(
          subscription: Subscription
        ) {
          const { stripeSubscriptionId: id, workspaceId } = subscription;
          const items = yield* billing.ensureItems(workspaceId, id);

          let paid = false;

          if (
            Option.isNone(subscription.paidInvoiceAt) &&
            entitles(subscription)
          ) {
            const invoices = yield* stripe.paidInvoices(workspaceId, id);

            if (invoices.length > 0) {
              // The threshold first: once the invoice is recorded, it is
              // never looked for again.
              yield* billing.setThreshold(workspaceId, id, Option.none());
              yield* subscriptions.markPaidInvoice(id, yield* DateTime.now);
              paid = true;
            }
          }

          return { items, paid };
        });

        const daily = Effect.gen(function* daily() {
          let after = Option.none<string>();
          let more = true;

          let kept: SubscriptionsKept = {
            failed: 0,
            itemsAdded: 0,
            itemsReplaced: 0,
            paid: 0,
            subscriptions: 0,
          };

          while (more) {
            const page = yield* subscriptions.perAccount(after, batchSize);

            const ended = yield* Effect.forEach(
              page,
              (subscription) =>
                keep(subscription).pipe(
                  Effect.map(Option.some),
                  Effect.catchTag("StripeUnreachable", (unreachable) =>
                    Effect.logWarning(
                      "Keeping a per-account subscription at Stripe failed"
                    ).pipe(
                      Effect.annotateLogs({
                        permanent: unreachable.permanent,
                        workspaceId: subscription.workspaceId,
                      }),
                      Effect.as(Option.none())
                    )
                  )
                ),
              { concurrency: reportConcurrency }
            );

            for (const outcome of ended) {
              kept = withOutcome(kept, outcome);
            }

            kept = { ...kept, subscriptions: kept.subscriptions + page.length };
            more = page.length === batchSize;
            after = Option.fromUndefinedOr(page.at(-1)?.stripeSubscriptionId);
          }

          return kept;
        }).pipe(Effect.withSpan("ReportUsage.daily"));

        return ReportUsage.of({ daily, run });
      })
    );

  static readonly layer = ReportUsage.make(reportBatchSize);
}
