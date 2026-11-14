import { DateTime, Option } from "effect";

import type { Subscription } from "#billing/domain/subscription.ts";
import { refundOf } from "#billing/domain/withdrawal.ts";

import type { InvoiceCredit, PaidInvoice } from "./ports/stripe-contracts.ts";

/**
 * What goes back of each paid invoice of a subscription ended at `at`: the
 * part of the period it paid for not supplied yet (`refundOf`, to the
 * second), that period read from its lines, or else the subscription's
 * current one; without either, all of it. An invoice for a period over
 * gives nothing. Per-account pricing bills in arrears: what it was paid was
 * for usage supplied, so nothing goes back, whatever its lines say. What a
 * withdrawal refunds, and what a legacy plan moved to per-account pricing
 * is credited.
 */
export const unusedCredits = (
  invoices: readonly PaidInvoice[],
  subscription: Subscription,
  at: DateTime.Utc
): readonly InvoiceCredit[] =>
  invoices.map((invoice) => {
    if (subscription.plan === "payAsYouGo") {
      return { amount: 0, invoiceId: invoice.invoiceId };
    }

    const period = Option.all({
      end: invoice.periodEnd,
      start: invoice.periodStart,
    }).pipe(
      Option.orElse(() =>
        Option.all({
          end: subscription.currentPeriodEnd,
          start: subscription.currentPeriodStart,
        })
      )
    );

    return {
      amount: Option.match(period, {
        onNone: () => invoice.paid.amount,
        onSome: ({ end, start }) =>
          refundOf({ end, paid: invoice.paid.amount, start }, at),
      }),
      invoiceId: invoice.invoiceId,
    };
  });

// The part of a period not supplied at `at`, between 0 and 1.
const unusedShare = (
  start: DateTime.Utc,
  end: DateTime.Utc,
  at: DateTime.Utc
): number => {
  const length = DateTime.toEpochMillis(end) - DateTime.toEpochMillis(start);

  if (length <= 0) {
    return 0;
  }

  const left = DateTime.toEpochMillis(end) - DateTime.toEpochMillis(at);

  return Math.min(Math.max(left / length, 0), 1);
};

/**
 * What a legacy plan that ends at `at` (moved to per-account pricing, or
 * retired) is credited of each paid invoice: each line's own period not
 * supplied yet, to the second, weighed by what the line charged, as a
 * share of what the invoice took (its tax included), rounded down and
 * never more than it took; with that share, which Stripe applies to what
 * is still refundable of it (a goodwill refund made since is not given
 * twice). A renewal that also carries an earlier
 * period's prorations is so credited line by line, not over the joined
 * span. An invoice whose lines give no period is read over its own
 * period; one with neither gives nothing rather than all, as a move may
 * come years after the start, and staff look at it. Stripe caps each at
 * what is still refundable.
 */
export const movedCredits = (
  invoices: readonly PaidInvoice[],
  at: DateTime.Utc
): readonly InvoiceCredit[] =>
  invoices.map((invoice) => {
    const paid = invoice.paid.amount;
    const lines = invoice.linePeriods ?? [];

    const charged = lines.reduce((sum, { amount }) => sum + amount, 0);

    if (lines.length > 0 && charged > 0) {
      const unused = lines.reduce(
        (sum, { amount, end, start }) =>
          sum + amount * unusedShare(start, end, at),
        0
      );

      const share = Math.min(1, Math.max(0, unused / charged));

      return {
        amount: Math.floor(paid * share),
        invoiceId: invoice.invoiceId,
        share,
      };
    }

    return Option.match(
      Option.all({ end: invoice.periodEnd, start: invoice.periodStart }),
      {
        onNone: (): InvoiceCredit => ({
          amount: 0,
          invoiceId: invoice.invoiceId,
        }),
        onSome: ({ end, start }): InvoiceCredit => {
          const share = unusedShare(start, end, at);

          return {
            amount: Math.floor(paid * share),
            invoiceId: invoice.invoiceId,
            share,
          };
        },
      }
    );
  });
