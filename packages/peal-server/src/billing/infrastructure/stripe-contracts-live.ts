import { DateTime, Effect, Layer, Option, Schema } from "effect";
import type { Stripe } from "stripe";

import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type {
  CreditReason,
  EndReason,
  InvoiceCredit,
  InvoiceCredited,
  PaidInvoice,
} from "#billing/application/ports/stripe-contracts.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { Money } from "#billing/domain/billing-notice.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

// A member waits on these calls: Stripe gets this long to answer each one.
const requestTimeout = 10_000;

// Why Stripe ended it, in its dashboard and its events.
const comments: Readonly<Record<EndReason, string>> = {
  cancelledLate:
    "Cancelled on Peal: the request came before the period renewed",
  duplicateSubscription:
    "Second per-account subscription of the same billing account",
  duplicateTrial: "Second trial of the same account or workspace",
  movedToRateCard:
    "Moved to per-account pricing on Peal: its unused time is credited",
  orderedDuringTrial: "Trial ended on Peal: a paid plan was ordered",
  trialCancelled: "Trial cancelled on Peal",
  withdrawn: "Consumer withdrawal on Peal",
};

const TaxIdsSchema = Schema.Array(
  Schema.Struct({
    type: Schema.String,
    verification: Schema.NullOr(Schema.Struct({ status: Schema.String })),
  })
);

const decodeTaxIds = Schema.decodeUnknownOption(TaxIdsSchema);

const PeriodSchema = Schema.Struct({ end: Schema.Int, start: Schema.Int });

const PaidInvoiceSchema = Schema.Struct({
  amount_paid: Schema.Int,
  total: Schema.optionalKey(Schema.Int),
  currency: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
  lines: Schema.optionalKey(
    Schema.Struct({
      data: Schema.Array(
        Schema.Struct({
          amount: Schema.optionalKey(Schema.Int),
          period: Schema.optionalKey(PeriodSchema),
        })
      ),
    })
  ),
});

const decodeInvoice = Schema.decodeUnknownOption(PaidInvoiceSchema);

const NoteSchema = Schema.Struct({
  amount: Schema.optionalKey(Schema.Int),
  currency: Schema.optionalKey(Schema.String),
  metadata: Schema.optionalKey(
    Schema.NullOr(Schema.Record(Schema.String, Schema.String))
  ),
});

const decodeNote = Schema.decodeUnknownOption(NoteSchema);

// The credit notes Stripe lists, those it describes otherwise left out.
const decodeNotes = (notes: readonly unknown[]) =>
  notes.flatMap((note) => Option.toArray(decodeNote(note)));

// What each credit note says it is for, on the invoice's page.
const memos: Readonly<Record<CreditReason["_tag"], string>> = {
  lateCancellation: "Renewal charged after the cancellation was received",
  movedToRateCard: "Unused time of a plan moved to per-account pricing",
  retirement: "Unused time of a retired plan, after the day it ended",
  withdrawal: "Consumer withdrawal",
};

const UpcomingSchema = Schema.Struct({
  currency: Schema.NonEmptyString,
  total: Schema.Int,
});

const decodeUpcoming = Schema.decodeUnknownOption(UpcomingSchema);

// Stripe refusing the request itself, as for a subscription it no longer
// has or no longer lets change: asking again changes nothing.
const isRefused = Schema.is(
  Schema.Struct({ type: Schema.Literal("StripeInvalidRequestError") })
);

// The code of an error Stripe gave, if it gave one.
const codeOf = Schema.decodeUnknownOption(
  Schema.Struct({ code: Schema.String })
);

// What an invoice still lets go back: what it took, less the credit notes
// made after it was paid.
const CreditableSchema = Schema.Struct({
  amount_paid: Schema.Int,
  currency: Schema.NonEmptyString,
  post_payment_credit_notes_amount: Schema.optionalKey(Schema.Int),
});

const decodeCreditable = Schema.decodeUnknownOption(CreditableSchema);

// An object Stripe names: its id, or the object expanded.
const StripeRefSchema = Schema.Union([
  Schema.String,
  Schema.Struct({ id: Schema.String }),
]);

type StripeRef = typeof StripeRefSchema.Type;

// The payment intents that paid an invoice.
const PaymentSchema = Schema.Struct({
  payment: Schema.Struct({
    payment_intent: Schema.optionalKey(StripeRefSchema),
  }),
});

const decodePayment = Schema.decodeUnknownOption(PaymentSchema);

const RefundSchema = Schema.Struct({
  amount: Schema.Int,
  id: Schema.String,
  status: Schema.NullOr(Schema.String),
});

const decodeRefund = Schema.decodeUnknownOption(RefundSchema);

// A credit note's refunds, which also show among the payment's.
const NoteRefundsSchema = Schema.Struct({
  refunds: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        refund: StripeRefSchema,
      })
    )
  ),
});

const decodeNoteRefunds = Schema.decodeUnknownOption(NoteRefundsSchema);

const isId = Schema.is(Schema.String);

// An object's id, as Stripe gives it: the id, or the object expanded.
const idOf = (ref: StripeRef | undefined): readonly string[] => {
  if (ref === undefined) {
    return [];
  }

  return [isId(ref) ? ref : ref.id];
};

// A refund that took money back, or still may.
const refunding = new Set(["pending", "requires_action", "succeeded"]);

const fromStripeTime = (seconds: number): DateTime.Utc =>
  DateTime.makeUnsafe(seconds * 1000);

// The period an invoice paid for: from its lines' first start to their
// last end.
const periodOf = (
  lines: readonly { readonly period?: typeof PeriodSchema.Type }[]
) => {
  const periods = lines.flatMap(({ period }) =>
    period === undefined ? [] : [period]
  );

  return periods.length === 0
    ? { periodEnd: Option.none(), periodStart: Option.none() }
    : {
        periodEnd: Option.some(
          fromStripeTime(Math.max(...periods.map(({ end }) => end)))
        ),
        periodStart: Option.some(
          fromStripeTime(Math.min(...periods.map(({ start }) => start)))
        ),
      };
};

// A credit note's key, kept in its metadata: Stripe forgets an
// idempotency key after a day, and a request can be taken up again
// weeks later, from its link or by staff.
const creditKeyOf = (reason: CreditReason, id: string, invoiceId: string) => {
  if (reason._tag === "withdrawal") {
    return `withdrawal-credit-${id}-${invoiceId}`;
  }

  if (reason._tag === "movedToRateCard") {
    return `moved-credit-${id}-${invoiceId}`;
  }

  return reason._tag === "retirement"
    ? `retirement-credit-${id}-${invoiceId}`
    : `late-cancellation-credit-${reason.requestKey}-${invoiceId}`;
};

// What is still refundable of an invoice: what it took, less the
// credit notes made since, less the refunds of its payments made
// outside a credit note (as from Stripe's dashboard).
const refundableOf = async (
  stripe: Stripe,
  invoiceId: string,
  notes: readonly unknown[]
): Promise<{ readonly currency: string; readonly left: number }> => {
  const invoice = decodeCreditable(await stripe.invoices.retrieve(invoiceId));

  if (Option.isNone(invoice)) {
    return { currency: "eur", left: 0 };
  }

  const payments = await stripe.invoicePayments
    .list({ invoice: invoiceId, limit: 100 })
    .autoPagingToArray({ limit: 100 });

  const intents = payments.flatMap((payment) =>
    Option.toArray(decodePayment(payment)).flatMap(({ payment: paid }) =>
      idOf(paid.payment_intent)
    )
  );

  const listed = await Promise.all(
    intents.map(
      async (intent) =>
        await stripe.refunds
          .list({ limit: 100, payment_intent: intent })
          .autoPagingToArray({ limit: 1000 })
    )
  );

  const refunds = listed
    .flat()
    .flatMap((refund) => Option.toArray(decodeRefund(refund)));

  const fromNotes = new Set(
    notes.flatMap((note) =>
      Option.toArray(decodeNoteRefunds(note)).flatMap(({ refunds: made }) =>
        (made ?? []).flatMap(({ refund }) => idOf(refund))
      )
    )
  );

  const outside = refunds
    .filter(
      ({ id, status }) =>
        !fromNotes.has(id) && status !== null && refunding.has(status)
    )
    .reduce((sum, { amount }) => sum + amount, 0);

  const { amount_paid: paid, currency } = invoice.value;
  const noted = invoice.value.post_payment_credit_notes_amount ?? 0;

  return { currency, left: Math.max(0, paid - noted - outside) };
};

/**
 * Billing's calls to Stripe through the server's key: each one bounded in
 * time, each change under an idempotency key, so a member trying again
 * changes nothing more. Without a Stripe key, billing is off and its use
 * cases never call them.
 */
export const StripeContractsLive = Layer.effect(
  StripeContracts,
  Effect.gen(function* StripeContractsLive() {
    const client = (yield* stripeSettingsConfig).pipe(
      Option.map((settings) =>
        stripeClientOf(settings, { timeout: requestTimeout })
      )
    );

    const call = <A>(
      workspaceId: WorkspaceId,
      request: (stripe: Stripe) => Promise<A>
    ): Effect.Effect<A, StripeUnreachable> =>
      Option.match(client, {
        onNone: () => Effect.die("Billing is off: Stripe has no key"),
        onSome: (stripe) =>
          Effect.tryPromise({
            // Stripe refusing the request itself will refuse it again.
            catch: (cause) => {
              if (!isRefused(cause)) {
                return new StripeUnreachable({ workspaceId });
              }

              const code = codeOf(cause);

              return Option.isSome(code)
                ? new StripeUnreachable({
                    code: code.value.code,
                    permanent: true,
                    workspaceId,
                  })
                : new StripeUnreachable({ permanent: true, workspaceId });
            },
            try: async () => await request(stripe),
          }),
      });

    const cancelAtPeriodEnd = (
      workspaceId: WorkspaceId,
      id: string,
      requestKey: string
    ) =>
      call(
        workspaceId,
        async (stripe) =>
          await stripe.subscriptions.update(
            id,
            { cancel_at_period_end: true },
            { idempotencyKey: `cancel-${id}-${requestKey}` }
          )
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("StripeContracts.cancelAtPeriodEnd")
      );

    const cancelOn = (
      workspaceId: WorkspaceId,
      id: string,
      at: DateTime.Utc,
      requestKey: string
    ) => {
      const seconds = Math.floor(DateTime.toEpochMillis(at) / 1000);

      return call(
        workspaceId,
        async (stripe) =>
          await stripe.subscriptions.update(
            id,
            // In a later period, Stripe always charges that period only up
            // to this instant.
            { cancel_at: seconds, proration_behavior: "create_prorations" },
            { idempotencyKey: `cancel-at-${id}-${seconds}-${requestKey}` }
          )
      ).pipe(Effect.asVoid, Effect.withSpan("StripeContracts.cancelAt"));
    };

    // Ends it at once, its unbilled usage invoiced now or never.
    const ending = (
      workspaceId: WorkspaceId,
      id: string,
      reason: EndReason,
      invoiced: boolean
    ) =>
      Option.match(client, {
        onNone: () => Effect.die("Billing is off: Stripe has no key"),
        onSome: (stripe) =>
          Effect.tryPromise({
            // A subscription Stripe no longer has, or has already ended:
            // nothing to end.
            catch: (cause) => isRefused(cause),
            try: async () =>
              await stripe.subscriptions.cancel(
                id,
                {
                  cancellation_details: { comment: comments[reason] },
                  invoice_now: invoiced,
                  prorate: false,
                },
                {
                  idempotencyKey: invoiced
                    ? `${reason}-invoiced-${id}`
                    : `${reason}-${id}`,
                }
              ),
          }).pipe(
            Effect.matchEffect({
              onFailure: (settled) =>
                settled
                  ? Effect.void
                  : Effect.fail(new StripeUnreachable({ workspaceId })),
              onSuccess: () => Effect.void,
            })
          ),
      });

    const endNow = (workspaceId: WorkspaceId, id: string, reason: EndReason) =>
      ending(workspaceId, id, reason, false).pipe(
        Effect.withSpan("StripeContracts.endNow")
      );

    const endAndInvoice = (
      workspaceId: WorkspaceId,
      id: string,
      reason: EndReason
    ) =>
      ending(workspaceId, id, reason, true).pipe(
        Effect.withSpan("StripeContracts.endAndInvoice")
      );

    const isBusiness = (workspaceId: WorkspaceId, customerId: string) =>
      call(
        workspaceId,
        async (stripe) =>
          await stripe.customers
            .listTaxIds(customerId, { limit: 100 })
            .autoPagingToArray({ limit: 100 })
      ).pipe(
        Effect.map((found) =>
          Option.match(decodeTaxIds(found), {
            onNone: () => false,
            onSome: (ids) =>
              ids.some(
                ({ type, verification }) =>
                  type === "eu_vat" && verification?.status === "verified"
              ),
          })
        ),
        Effect.withSpan("StripeContracts.isBusiness")
      );

    const paidInvoices = (
      workspaceId: WorkspaceId,
      id: string,
      options?: { readonly settledByCredit?: boolean }
    ) =>
      call(
        workspaceId,
        async (stripe) =>
          await stripe.invoices
            .list({ limit: 100, status: "paid", subscription: id })
            .autoPagingToArray({ limit: 1000 })
      ).pipe(
        Effect.map((found) =>
          found.flatMap((invoice) =>
            Option.toArray(
              decodeInvoice(invoice).pipe(
                Option.filter(
                  ({ amount_paid: paid, total }) =>
                    paid > 0 ||
                    (options?.settledByCredit === true && (total ?? 0) > 0)
                ),
                Option.map((paid): PaidInvoice => ({
                  invoiceId: paid.id,
                  lines: (paid.lines?.data ?? []).flatMap(
                    ({ amount, period }) =>
                      amount === undefined || period === undefined
                        ? []
                        : [{ amount, start: fromStripeTime(period.start) }]
                  ),
                  linePeriods: (paid.lines?.data ?? []).flatMap(
                    ({ amount, period }) =>
                      amount === undefined || period === undefined
                        ? []
                        : [
                            {
                              amount,
                              end: fromStripeTime(period.end),
                              start: fromStripeTime(period.start),
                            },
                          ]
                  ),
                  paid: { amount: paid.amount_paid, currency: paid.currency },
                  ...periodOf(paid.lines?.data ?? []),
                }))
              )
            )
          )
        ),
        Effect.withSpan("StripeContracts.paidInvoices")
      );

    const credit = (
      workspaceId: WorkspaceId,
      id: string,
      credits: readonly InvoiceCredit[],
      reason: CreditReason
    ) =>
      Effect.forEach(
        credits.filter(({ amount }) => amount > 0),
        ({ amount, invoiceId }) => {
          const key = creditKeyOf(reason, id, invoiceId);

          return call(workspaceId, async (stripe): Promise<InvoiceCredited> => {
            const made = await stripe.creditNotes
              .list({ invoice: invoiceId, limit: 100 })
              .autoPagingToArray({ limit: 1000 });

            const found = decodeNotes(made).find(
              (note) => note.metadata?.["key"] === key
            );

            if (found !== undefined) {
              return {
                asked: amount,
                credited: found.amount ?? amount,
                currency: found.currency ?? "eur",
                invoiceId,
              };
            }

            const { currency, left } = await refundableOf(
              stripe,
              invoiceId,
              made
            );

            const credited = Math.min(amount, left);

            if (credited > 0) {
              await stripe.creditNotes.create(
                {
                  amount: credited,
                  invoice: invoiceId,
                  memo: memos[reason._tag],
                  metadata: { key, reason: reason._tag, subscription: id },
                  refund_amount: credited,
                },
                { idempotencyKey: key }
              );
            }

            return { asked: amount, credited, currency, invoiceId };
          });
        }
      ).pipe(Effect.withSpan("StripeContracts.credit"));

    const endAtTrialEnd = (
      workspaceId: WorkspaceId,
      id: string,
      trialEnd: DateTime.Utc
    ) => {
      const cancelAt = Math.floor(DateTime.toEpochMillis(trialEnd) / 1000);

      return Option.match(client, {
        onNone: () => Effect.die("Billing is off: Stripe has no key"),
        onSome: (stripe) =>
          Effect.tryPromise({
            catch: (cause) => isRefused(cause),
            try: async () =>
              await stripe.subscriptions.update(
                id,
                { cancel_at: cancelAt, proration_behavior: "none" },
                { idempotencyKey: `trial-end-${id}-${cancelAt}` }
              ),
          }).pipe(
            Effect.matchEffect({
              onFailure: (refused) =>
                refused
                  ? Effect.logWarning(
                      "Stripe refused to end a trial at its end"
                    ).pipe(Effect.annotateLogs({ subscription: id }))
                  : Effect.fail(new StripeUnreachable({ workspaceId })),
              onSuccess: () => Effect.void,
            })
          ),
      }).pipe(Effect.withSpan("StripeContracts.endAtTrialEnd"));
    };

    const upcomingTotal = (workspaceId: WorkspaceId, id: string) =>
      Option.match(client, {
        onNone: () => Effect.die("Billing is off: Stripe has no key"),
        onSome: (stripe) =>
          Effect.tryPromise({
            catch: (cause) => isRefused(cause),
            try: async () =>
              await stripe.invoices.createPreview({ subscription: id }),
          }).pipe(
            Effect.matchEffect({
              // No next invoice, as for one that ends.
              onFailure: (refused) =>
                refused
                  ? Effect.succeed(Option.none<Money>())
                  : Effect.fail(new StripeUnreachable({ workspaceId })),
              onSuccess: (invoice) =>
                Effect.succeed(
                  decodeUpcoming(invoice).pipe(
                    Option.map(({ currency, total }): Money => ({
                      amount: total,
                      currency,
                    }))
                  )
                ),
            })
          ),
      }).pipe(Effect.withSpan("StripeContracts.upcomingTotal"));

    return StripeContracts.of({
      cancelAt: cancelOn,
      cancelAtPeriodEnd,
      credit,
      endAtTrialEnd,
      endAndInvoice,
      endNow,
      isBusiness,
      paidInvoices,
      upcomingTotal,
    });
  })
);
