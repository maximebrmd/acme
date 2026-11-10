import { DateTime, Effect, Layer, Option, Schema } from "effect";
import type { Stripe } from "stripe";

import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type {
  CreditReason,
  EndReason,
  InvoiceCredit,
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
  duplicateTrial: "Second trial of the same account or workspace",
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
const creditKeyOf = (reason: CreditReason, id: string, invoiceId: string) =>
  reason._tag === "withdrawal"
    ? `withdrawal-credit-${id}-${invoiceId}`
    : `late-cancellation-credit-${reason.requestKey}-${invoiceId}`;

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
            catch: (cause) =>
              new StripeUnreachable({
                permanent: isRefused(cause),
                workspaceId,
              }),
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

    const endNow = (workspaceId: WorkspaceId, id: string, reason: EndReason) =>
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
                  invoice_now: false,
                  prorate: false,
                },
                { idempotencyKey: `${reason}-${id}` }
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
      }).pipe(Effect.withSpan("StripeContracts.endNow"));

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

    const paidInvoices = (workspaceId: WorkspaceId, id: string) =>
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
                Option.filter(({ amount_paid: paid }) => paid > 0),
                Option.map((paid): PaidInvoice => ({
                  invoiceId: paid.id,
                  lines: (paid.lines?.data ?? []).flatMap(
                    ({ amount, period }) =>
                      amount === undefined || period === undefined
                        ? []
                        : [{ amount, start: fromStripeTime(period.start) }]
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

          return call(workspaceId, async (stripe) => {
            const made = await stripe.creditNotes
              .list({ invoice: invoiceId, limit: 100 })
              .autoPagingToArray({ limit: 1000 });

            if (
              decodeNotes(made).some((note) => note.metadata?.["key"] === key)
            ) {
              return;
            }

            await stripe.creditNotes.create(
              {
                amount,
                invoice: invoiceId,
                memo: memos[reason._tag],
                metadata: { key, reason: reason._tag, subscription: id },
                refund_amount: amount,
              },
              { idempotencyKey: key }
            );
          });
        },
        { discard: true }
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
      endNow,
      isBusiness,
      paidInvoices,
      upcomingTotal,
    });
  })
);
