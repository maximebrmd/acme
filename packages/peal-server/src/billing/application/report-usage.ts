import { Context, DateTime, Effect, Layer, Metric, Option, Ref } from "effect";

import { stampOf, unverifiedThreshold } from "#billing/domain/account-days.ts";
import { entitles } from "#billing/domain/subscription.ts";
import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

import { AccountDayStore } from "./ports/account-day-store.ts";
import type { UnsentReport } from "./ports/account-day-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { StripeContracts } from "./ports/stripe-contracts.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { UsageBilling } from "./ports/usage-billing.ts";
import { thresholdsUnset } from "./record-subscription.ts";

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

/**
 * Reports Stripe refused for good, kept unsent, when the last run ended:
 * a state, so its alert fires however the counter was born
 * (peal-usage-report-refused).
 */
export const refusedKept = Metric.gauge(
  "peal.billing.usage_report.refused_kept",
  {
    description:
      "Meter events Stripe refused for good, kept unsent in the outbox, when the reporter's last run ended",
  }
);

/**
 * Customers whose reports the last run left because Stripe refused what
 * is not the event's own (the server's key, its permissions, a meter): an
 * alert rule reads it (peal-usage-report-key-refused).
 */
export const customersPaused = Metric.gauge(
  "peal.billing.usage_report.paused",
  {
    description:
      "Customers whose meter events the reporter's last run left because Stripe refused the server's key, its permissions or a meter",
  }
);

/**
 * After this many attempts in a row Stripe did not answer, or refused the
 * server's key, a run stops.
 */
export const retriesBeforeHalting = 5;

/** What one customer's turn in a run did. */
interface CustomerTurn {
  /** Its reports left for the next run. */
  readonly deferred: number;
  /** Stopped by a refusal that is not the event's own. */
  readonly paused: boolean;
  readonly refused: number;
  readonly sent: readonly string[];
  readonly stalled: boolean;
}

/** What a run of the reporter did. */
export interface UsageReportRun {
  /** Reports Stripe did not take this run, left for the next. */
  readonly deferred: number;
  /** Customers paused by a refusal that is not their events' own. */
  readonly paused: number;
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
  reports: readonly UnsentReport[]
): readonly (readonly UnsentReport[])[] => {
  const grouped = new Map<string, UnsentReport[]>();

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
        const { enabled } = yield* BillingMode;

        // On a server that bills, every series exists from the start: a
        // counter's first refusal is then an increase, and a reporter that
        // never ends a run is stopped 30 minutes after the start.
        if (enabled) {
          const started = Math.floor(
            DateTime.toEpochMillis(yield* DateTime.now) / 1000
          );

          yield* Metric.update(reportsRefused, 0);
          yield* Metric.update(reportedAt, started);
          yield* Metric.update(thresholdsUnset, 0);

          // The refusals kept are a state of the rows: read, never zeroed,
          // so a restart neither clears nor fires the alert again. Paused
          // customers are told by the first run.
          yield* store.backlog.pipe(
            Effect.flatMap(({ refused }) =>
              Metric.update(refusedKept, refused)
            ),
            Effect.catchCause((cause) =>
              Effect.logWarning(
                "Reading the refusals kept at the start failed",
                cause
              )
            )
          );
        }

        // A run stops asking Stripe after this many attempts in a row it
        // did not take: an outage or a refused key answers every customer
        // the same, and the next run comes in five minutes.
        const halted = yield* Ref.make(0);

        // One customer's reports, in order, until Stripe does not take
        // one, each stamped once at its first attempt, the customer's sent
        // ones marked as soon as its turn ends.
        const sendAll = Effect.fn("ReportUsage.sendAll")(function* sendAll(
          reports: readonly UnsentReport[]
        ) {
          const sent: string[] = [];
          let refused = 0;

          let ended: CustomerTurn = {
            deferred: 0,
            paused: false,
            refused: 0,
            sent,
            stalled: false,
          };

          for (const [index, report] of reports.entries()) {
            if ((yield* Ref.get(halted)) >= retriesBeforeHalting) {
              ended = {
                deferred: reports.length - index,
                paused: false,
                refused,
                sent,
                stalled: true,
              };

              break;
            }

            const now = yield* DateTime.now;

            const timestamp = Option.isSome(report.stampedAt)
              ? report.stampedAt.value
              : yield* store.stamp(
                  report.identifier,
                  stampOf(report.occurredAt, now)
                );

            const outcome = yield* billing.report({
              eventName: report.eventName,
              identifier: report.identifier,
              stripeCustomerId: report.stripeCustomerId,
              timestamp,
              value: report.value,
            });

            if (outcome._tag === "retry") {
              // Only what is the same for every customer stops the run: a
              // refusal of one customer's own pauses that customer alone.
              if (outcome.reason !== "refusing") {
                yield* Ref.update(halted, (count) => count + 1);
              }

              ended = {
                deferred: reports.length - index,
                paused: outcome.reason !== "unavailable",
                refused,
                sent,
                stalled: true,
              };

              break;
            }

            yield* Ref.set(halted, 0);

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

            ended = { ...ended, refused };
          }

          yield* store.markSent(sent, yield* DateTime.now);

          if (ended.paused) {
            yield* Effect.logWarning(
              "Stripe refused a meter event for what is not the event's own: the customer waits for the next run"
            ).pipe(
              Effect.annotateLogs({
                customers: 1,
                eventName: reports[0]?.eventName ?? "",
              })
            );
          }

          return ended;
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
          let paused = 0;
          // A customer Stripe did not take one of is left to the next run,
          // its later reports with it, whatever page they are on.
          const stalled = new Set<string>();

          yield* Ref.set(halted, 0);

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

            for (const [index, group] of ended.entries()) {
              const customer = going[index]?.[0]?.stripeCustomerId;

              if (group.stalled && customer !== undefined) {
                stalled.add(customer);
              }

              sent += group.sent.length;
              refused += group.refused;
              deferred += group.deferred;
              paused += group.paused ? 1 : 0;
            }

            for (const group of waiting) {
              deferred += group.length;
            }

            const last = page.at(-1);

            more = page.length === batchSize;
            after = Option.fromUndefinedOr(last).pipe(
              Option.map(({ createdAt, identifier }) => ({
                createdAt,
                identifier,
              }))
            );
          }

          return { deferred, paused, refused, sent };
        });

        const run = Effect.gen(function* run() {
          const done = yield* send();
          const { left, oldest, refused } = yield* store.backlog;
          const now = yield* DateTime.now;

          yield* Metric.update(reportsLeft, left);
          yield* Metric.update(refusedKept, refused);
          yield* Metric.update(customersPaused, done.paused);
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
            // One settled from a credit balance counts too: the customer
            // paid it, if not by card.
            const invoices = yield* stripe.paidInvoices(workspaceId, id, {
              settledByCredit: true,
            });

            if (invoices.length > 0) {
              // The threshold first: once the invoice is recorded, it is
              // never looked for again.
              yield* billing.setThreshold(workspaceId, id, Option.none());
              yield* subscriptions.markPaidInvoice(id, yield* DateTime.now);
              paid = true;
            } else {
              // Until then it invoices at the threshold, set again each
              // day: Stripe may have refused it when it was recorded.
              yield* billing
                .setThreshold(workspaceId, id, Option.some(unverifiedThreshold))
                .pipe(
                  Effect.catchIf(
                    ({ permanent }) => permanent,
                    () =>
                      Metric.update(thresholdsUnset, 1).pipe(
                        Effect.andThen(
                          Effect.logError(
                            "Stripe refused the unverified billing threshold again"
                          ).pipe(Effect.annotateLogs({ workspaceId }))
                        )
                      )
                  )
                );
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
