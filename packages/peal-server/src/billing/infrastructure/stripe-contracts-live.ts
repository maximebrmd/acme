import { Effect, Layer, Option, Schema, SchemaGetter } from "effect";
import type { Stripe } from "stripe";

import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import type {
  EndReason,
  PeriodPayment,
} from "#billing/application/ports/stripe-contracts.ts";
import { StripeUnreachable } from "#billing/application/stripe-unreachable.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { stripeClientOf } from "#shared/infrastructure/stripe-client.ts";
import { stripeSettingsConfig } from "#shared/infrastructure/stripe-settings.ts";

// A member waits on these calls: Stripe gets this long to answer each one.
const requestTimeout = 10_000;

// Stripe's answer to a subscription it no longer has: nothing to end.
const isSettled = Schema.is(
  Schema.Struct({ code: Schema.Literal("resource_missing") })
);

// Why Stripe ended it, in its dashboard and its events.
const comments: Readonly<Record<EndReason, string>> = {
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

const PaidInvoiceSchema = Schema.Struct({
  amount_paid: Schema.Int,
  currency: Schema.NonEmptyString,
  id: Schema.NonEmptyString,
});

const decodeInvoice = Schema.decodeUnknownOption(PaidInvoiceSchema);

// The payment intent an invoice payment names, as an id or expanded.
const IntentSchema = Schema.Union([
  Schema.NonEmptyString,
  Schema.Struct({ id: Schema.NonEmptyString }).pipe(
    Schema.decodeTo(Schema.NonEmptyString, {
      decode: SchemaGetter.transform(({ id }) => id),
      encode: SchemaGetter.transform((id) => ({ id })),
    })
  ),
]);

const InvoicePaymentSchema = Schema.Struct({
  payment: Schema.Struct({ payment_intent: Schema.optionalKey(IntentSchema) }),
});

const decodePayment = Schema.decodeUnknownOption(InvoicePaymentSchema);

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
            catch: () => new StripeUnreachable({ workspaceId }),
            try: async () => await request(stripe),
          }),
      });

    const cancelAtPeriodEnd = (workspaceId: WorkspaceId, id: string) =>
      call(
        workspaceId,
        async (stripe) =>
          await stripe.subscriptions.update(
            id,
            { cancel_at_period_end: true },
            { idempotencyKey: `cancel-${id}` }
          )
      ).pipe(
        Effect.asVoid,
        Effect.withSpan("StripeContracts.cancelAtPeriodEnd")
      );

    const endNow = (workspaceId: WorkspaceId, id: string, reason: EndReason) =>
      Option.match(client, {
        onNone: () => Effect.die("Billing is off: Stripe has no key"),
        onSome: (stripe) =>
          Effect.tryPromise({
            catch: (cause) => isSettled(cause),
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

    const latestPayment = Effect.fn("StripeContracts.latestPayment")(
      function* latestPayment(workspaceId: WorkspaceId, id: string) {
        const invoices = yield* call(
          workspaceId,
          async (stripe) =>
            await stripe.invoices.list({
              limit: 1,
              status: "paid",
              subscription: id,
            })
        );

        const invoice = Option.fromUndefinedOr(invoices.data[0]).pipe(
          Option.flatMap(decodeInvoice),
          Option.filter(({ amount_paid: paid }) => paid > 0)
        );

        if (Option.isNone(invoice)) {
          return Option.none<PeriodPayment>();
        }

        const { amount_paid: paid, currency, id: invoiceId } = invoice.value;

        const payments = yield* call(
          workspaceId,
          async (stripe) =>
            await stripe.invoicePayments.list({
              invoice: invoiceId,
              limit: 10,
              status: "paid",
            })
        );

        return Option.fromUndefinedOr(
          payments.data
            .flatMap((payment) =>
              Option.toArray(
                decodePayment(payment).pipe(
                  Option.flatMap(({ payment: paidBy }) =>
                    Option.fromUndefinedOr(paidBy.payment_intent)
                  )
                )
              )
            )
            .at(0)
        ).pipe(
          Option.map((paymentIntentId): PeriodPayment => ({
            paid: { amount: paid, currency },
            paymentIntentId,
          }))
        );
      }
    );

    const refund = (
      workspaceId: WorkspaceId,
      id: string,
      payment: PeriodPayment,
      amount: number
    ) =>
      call(
        workspaceId,
        async (stripe) =>
          await stripe.refunds.create(
            {
              amount,
              metadata: { reason: "withdrawal", subscription: id },
              payment_intent: payment.paymentIntentId,
              reason: "requested_by_customer",
            },
            { idempotencyKey: `withdrawal-refund-${id}` }
          )
      ).pipe(Effect.asVoid, Effect.withSpan("StripeContracts.refund"));

    return StripeContracts.of({
      cancelAtPeriodEnd,
      endNow,
      isBusiness,
      latestPayment,
      refund,
    });
  })
);
