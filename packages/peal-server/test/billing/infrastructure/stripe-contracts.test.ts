// Billing's calls to Stripe, against a stand-in for Stripe's API: what each
// call asks, under which idempotency key, and how its answers are read.
import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Context, Effect, Layer, Option } from "effect";

import { StripeContracts } from "#billing/application/ports/stripe-contracts.ts";
import { StripeContractsLive } from "#billing/infrastructure/stripe-contracts-live.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import {
  empty,
  headerOf,
  json,
  platformServer,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
} from "#test/publishing/fakes/platform-server.ts";

const workspaceId = WorkspaceIdSchema.make(
  "9c0d1e2f-3a4b-4c5d-8e6f-7a8b9c0d1e2f"
);

const list = (data: readonly JsonValue[], url: string) =>
  json({ data: [...data], has_more: false, object: "list", url });

// Stripe as billing calls it: `cus_business` gave a verified VAT number,
// `cus_consumer` one VIES has not verified; `sub_paid` has a paid invoice
// of 900 cents through `pi_synthetic`, `sub_free` none; `sub_missing` is
// no subscription Stripe knows. `failing` answers every request an error.
const fakeStripe = (options: { readonly failing?: boolean } = {}) =>
  platformServer((request): PlatformAnswer => {
    if (options.failing === true) {
      return empty(500);
    }

    const { method, path, query } = request;

    const taxIds = /^\/v1\/customers\/(?<id>[^/]+)\/tax_ids$/u.exec(path)
      ?.groups?.["id"];

    if (method === "GET" && taxIds !== undefined) {
      return list(
        [
          {
            id: "txi_synthetic",
            object: "tax_id",
            type: "eu_vat",
            value: "FR00000000000",
            verification: {
              status: taxIds === "cus_business" ? "verified" : "pending",
            },
          },
        ],
        path
      );
    }

    if (method === "GET" && path === "/v1/invoices") {
      return list(
        query.get("subscription") === "sub_paid"
          ? [
              {
                amount_paid: 900,
                currency: "eur",
                id: "in_synthetic",
                object: "invoice",
                status: "paid",
              },
            ]
          : [],
        path
      );
    }

    if (method === "GET" && path === "/v1/invoice_payments") {
      return list(
        [
          {
            id: "inpay_synthetic",
            object: "invoice_payment",
            payment: { payment_intent: "pi_synthetic", type: "payment_intent" },
          },
        ],
        path
      );
    }

    if (method === "POST" && path === "/v1/refunds") {
      return json({ amount: 810, id: "re_synthetic", object: "refund" });
    }

    const subscription = /^\/v1\/subscriptions\/(?<id>[^/]+)$/u.exec(path)
      ?.groups?.["id"];

    if (subscription === "sub_missing") {
      return json(
        {
          error: {
            code: "resource_missing",
            message: "No such subscription",
            type: "invalid_request_error",
          },
        },
        404
      );
    }

    if (subscription !== undefined) {
      return json({
        id: subscription,
        object: "subscription",
        status: method === "DELETE" ? "canceled" : "active",
      });
    }

    return json({ error: { message: "Unrecognized request URL" } }, 404);
  });

const contractsOn = (apiUrl: string) =>
  Layer.build(
    StripeContractsLive.pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            STRIPE_API_URL: apiUrl,
            STRIPE_SECRET_KEY: "sk_test_0123456789syntheticcontracts",
            STRIPE_WEBHOOK_SECRET: "whsec_synthetic_contracts",
          })
        )
      )
    )
  ).pipe(Effect.map(Context.get(StripeContracts)));

layer(Layer.empty)("billing's calls to Stripe", (it) => {
  it.effect("tell a business by a VAT number Stripe verified", () =>
    Effect.gen(function* business() {
      const stripe = yield* fakeStripe();
      const contracts = yield* contractsOn(stripe.url);

      assert.isTrue(yield* contracts.isBusiness(workspaceId, "cus_business"));
      assert.isFalse(yield* contracts.isBusiness(workspaceId, "cus_consumer"));
    }).pipe(Effect.scoped)
  );

  it.effect(
    "find what the latest paid invoice took, and refund part of it once",
    () =>
      Effect.gen(function* refunds() {
        const stripe = yield* fakeStripe();
        const contracts = yield* contractsOn(stripe.url);

        assert.isTrue(
          Option.isNone(yield* contracts.latestPayment(workspaceId, "sub_free"))
        );

        const payment = yield* contracts.latestPayment(workspaceId, "sub_paid");

        assert.deepStrictEqual(
          payment,
          Option.some({
            paid: { amount: 900, currency: "eur" },
            paymentIntentId: "pi_synthetic",
          })
        );

        if (Option.isSome(payment)) {
          yield* contracts.refund(workspaceId, "sub_paid", payment.value, 810);
        }

        const refund = stripe
          .requests()
          .find(({ path }) => path === "/v1/refunds");

        assert.isDefined(refund);

        if (refund !== undefined) {
          const form = new URLSearchParams(textOf(refund));

          assert.strictEqual(form.get("amount"), "810");
          assert.strictEqual(form.get("payment_intent"), "pi_synthetic");
          assert.strictEqual(
            headerOf(refund, "idempotency-key"),
            "withdrawal-refund-sub_paid"
          );
        }
      }).pipe(Effect.scoped)
  );

  it.effect(
    "end a subscription now without proration, once, or at its period's end",
    () =>
      Effect.gen(function* ends() {
        const stripe = yield* fakeStripe();
        const contracts = yield* contractsOn(stripe.url);

        yield* contracts.endNow(workspaceId, "sub_paid", "withdrawn");
        // One Stripe no longer has is already ended.
        yield* contracts.endNow(workspaceId, "sub_missing", "withdrawn");
        yield* contracts.cancelAtPeriodEnd(workspaceId, "sub_paid");

        const [ended, , cancelled] = stripe.requests();

        assert.strictEqual(ended?.method, "DELETE");
        assert.strictEqual(
          ended === undefined ? "" : headerOf(ended, "idempotency-key"),
          "withdrawn-sub_paid"
        );

        // A DELETE sends its parameters in the query, others in the body.
        const endForm = ended?.query ?? new URLSearchParams();

        assert.strictEqual(endForm.get("prorate"), "false");
        assert.strictEqual(endForm.get("invoice_now"), "false");
        assert.strictEqual(
          new URLSearchParams(
            cancelled === undefined ? "" : textOf(cancelled)
          ).get("cancel_at_period_end"),
          "true"
        );
      }).pipe(Effect.scoped)
  );

  it.effect("fail as Stripe unreachable when Stripe errs", () =>
    Effect.gen(function* failing() {
      const stripe = yield* fakeStripe({ failing: true });
      const contracts = yield* contractsOn(stripe.url);

      const failure = yield* contracts
        .endNow(workspaceId, "sub_paid", "withdrawn")
        .pipe(Effect.flip);

      assert.deepStrictEqual(failure._tag, "StripeUnreachable");
    }).pipe(Effect.scoped)
  );
});
