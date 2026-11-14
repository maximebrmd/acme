import { Option } from "effect";
import type { DateTime } from "effect";

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

/**
 * What a legacy plan moved to per-account pricing at `at` is credited of
 * each paid invoice: the part of the period that invoice paid for, read
 * from its own lines, not supplied yet. Unlike a withdrawal, which looks
 * at the 14 days after the start, a move may come years after it: an
 * invoice whose lines say no period gives nothing rather than all, and
 * staff look at it.
 */
export const movedCredits = (
  invoices: readonly PaidInvoice[],
  at: DateTime.Utc
): readonly InvoiceCredit[] =>
  invoices.map((invoice) => ({
    amount: Option.match(
      Option.all({ end: invoice.periodEnd, start: invoice.periodStart }),
      {
        onNone: () => 0,
        onSome: ({ end, start }) =>
          refundOf({ end, paid: invoice.paid.amount, start }, at),
      }
    ),
    invoiceId: invoice.invoiceId,
  }));
