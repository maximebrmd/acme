// Billing's calls to Stripe, against a stand-in for Stripe's API: what each
// call asks, under which idempotency key, and how its answers are read.
import { assert, layer } from "@effect/vitest";
import {
  ConfigProvider,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
} from "effect";

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
// `cus_consumer` one VIES has not verified; `sub_paid` has paid invoices of
// 1500 (a change of plan's) and 900 cents, and one of nothing, `sub_free`
// none; `sub_missing` is no subscription Stripe knows. `failing` answers
// every request an error.
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
                amount_paid: 1500,
                currency: "eur",
                id: "in_proration",
                lines: {
                  data: [
                    { period: { end: 1_796_083_200, start: 1_794_009_600 } },
                  ],
                },
                object: "invoice",
                status: "paid",
              },
              {
                amount_paid: 900,
                currency: "eur",
                id: "in_synthetic",
                lines: {
                  data: [
                    { period: { end: 1_796_083_200, start: 1_793_491_200 } },
                  ],
                },
                object: "invoice",
                status: "paid",
              },
              {
                amount_paid: 0,
                currency: "eur",
                id: "in_nothing",
                object: "invoice",
                status: "paid",
              },
            ]
          : [],
        path
      );
    }

    if (method === "POST" && path === "/v1/invoices/create_preview") {
      return json({ currency: "eur", object: "invoice", total: 9000 });
    }

    if (method === "POST" && path === "/v1/credit_notes") {
      return json({ id: "cn_synthetic", object: "credit_note" });
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
    "find each paid invoice and its period, and credit each once, refunded",
    () =>
      Effect.gen(function* refunds() {
        const stripe = yield* fakeStripe();
        const contracts = yield* contractsOn(stripe.url);

        assert.deepStrictEqual(
          yield* contracts.paidInvoices(workspaceId, "sub_free"),
          []
        );

        const invoices = yield* contracts.paidInvoices(workspaceId, "sub_paid");

        assert.deepStrictEqual(invoices, [
          {
            invoiceId: "in_proration",
            paid: { amount: 1500, currency: "eur" },
            periodEnd: Option.some(DateTime.makeUnsafe(1_796_083_200_000)),
            periodStart: Option.some(DateTime.makeUnsafe(1_794_009_600_000)),
          },
          {
            invoiceId: "in_synthetic",
            paid: { amount: 900, currency: "eur" },
            periodEnd: Option.some(DateTime.makeUnsafe(1_796_083_200_000)),
            periodStart: Option.some(DateTime.makeUnsafe(1_793_491_200_000)),
          },
        ]);

        yield* contracts.credit(workspaceId, "sub_paid", [
          { amount: 1250, invoiceId: "in_proration" },
          { amount: 0, invoiceId: "in_synthetic" },
        ]);

        const credits = stripe
          .requests()
          .filter(({ path }) => path === "/v1/credit_notes");

        // Nothing to credit, no credit note.
        assert.strictEqual(credits.length, 1);

        const [creditNote] = credits;

        if (creditNote !== undefined) {
          const form = new URLSearchParams(textOf(creditNote));

          assert.strictEqual(form.get("invoice"), "in_proration");
          assert.strictEqual(form.get("amount"), "1250");
          assert.strictEqual(form.get("refund_amount"), "1250");
          assert.strictEqual(
            headerOf(creditNote, "idempotency-key"),
            "withdrawal-credit-sub_paid-in_proration"
          );
        }
      }).pipe(Effect.scoped)
  );

  it.effect(
    "set a trial to end with its trial, and read the next invoice's total",
    () =>
      Effect.gen(function* trial() {
        const stripe = yield* fakeStripe();
        const contracts = yield* contractsOn(stripe.url);

        yield* contracts.endAtTrialEnd(
          workspaceId,
          "sub_trial",
          DateTime.makeUnsafe(1_796_083_200_000)
        );
        // One Stripe no longer has is left alone.
        yield* contracts.endAtTrialEnd(
          workspaceId,
          "sub_missing",
          DateTime.makeUnsafe(1_796_083_200_000)
        );

        const [update] = stripe.requests();

        const form = new URLSearchParams(
          update === undefined ? "" : textOf(update)
        );

        assert.strictEqual(form.get("cancel_at"), "1796083200");
        assert.strictEqual(form.get("proration_behavior"), "none");
        assert.strictEqual(
          update === undefined ? "" : headerOf(update, "idempotency-key"),
          "trial-end-sub_trial-1796083200"
        );

        assert.deepStrictEqual(
          yield* contracts.upcomingTotal(workspaceId, "sub_paid"),
          Option.some({ amount: 9000, currency: "eur" })
        );
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
