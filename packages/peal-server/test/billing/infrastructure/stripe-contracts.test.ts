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
// What sub_paid's customer paid: a change of plan, a first period, and an
// invoice that took nothing.
const paidInvoices = [
  {
    amount_paid: 1500,
    currency: "eur",
    id: "in_proration",
    lines: {
      data: [
        {
          amount: 1250,
          period: { end: 1_796_083_200, start: 1_794_009_600 },
        },
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
      data: [{ period: { end: 1_796_083_200, start: 1_793_491_200 } }],
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
];

// Only the business's VAT number was verified.
const verificationOf = (customer: string) =>
  customer === "cus_business" ? "verified" : "pending";

// One invoice was credited for a late cancellation, some time ago.
const notesOf = (invoice: string | null) =>
  invoice === "in_synthetic"
    ? [
        {
          id: "cn_earlier",
          metadata: { key: "late-cancellation-credit-request-1-in_synthetic" },
          object: "credit_note",
        },
      ]
    : [];

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
            verification: { status: verificationOf(taxIds) },
          },
        ],
        path
      );
    }

    if (method === "GET" && path === "/v1/invoices") {
      return list(
        query.get("subscription") === "sub_paid" ? paidInvoices : [],
        path
      );
    }

    if (method === "POST" && path === "/v1/invoices/create_preview") {
      return json({ currency: "eur", object: "invoice", total: 9000 });
    }

    if (method === "POST" && path === "/v1/credit_notes") {
      return json({ id: "cn_synthetic", object: "credit_note" });
    }

    if (method === "GET" && path === "/v1/credit_notes") {
      return list(notesOf(query.get("invoice")), path);
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
            lines: [
              { amount: 1250, start: DateTime.makeUnsafe(1_794_009_600_000) },
            ],
            paid: { amount: 1500, currency: "eur" },
            periodEnd: Option.some(DateTime.makeUnsafe(1_796_083_200_000)),
            periodStart: Option.some(DateTime.makeUnsafe(1_794_009_600_000)),
          },
          {
            invoiceId: "in_synthetic",
            lines: [],
            paid: { amount: 900, currency: "eur" },
            periodEnd: Option.some(DateTime.makeUnsafe(1_796_083_200_000)),
            periodStart: Option.some(DateTime.makeUnsafe(1_793_491_200_000)),
          },
        ]);

        yield* contracts.credit(
          workspaceId,
          "sub_paid",
          [
            { amount: 1250, invoiceId: "in_proration" },
            { amount: 0, invoiceId: "in_synthetic" },
          ],
          { _tag: "withdrawal" }
        );
        // A request whose credit note Stripe already has, made days ago,
        // past the life of an idempotency key: not made again.
        yield* contracts.credit(
          workspaceId,
          "sub_paid",
          [{ amount: 900, invoiceId: "in_synthetic" }],
          { _tag: "lateCancellation", requestKey: "request-1" }
        );

        const credits = stripe
          .requests()
          .filter(
            ({ method, path }) =>
              method === "POST" && path === "/v1/credit_notes"
          );

        // Nothing to credit, no credit note.
        assert.strictEqual(credits.length, 1);

        const [creditNote] = credits;

        if (creditNote !== undefined) {
          const form = new URLSearchParams(textOf(creditNote));

          assert.strictEqual(form.get("invoice"), "in_proration");
          assert.strictEqual(form.get("amount"), "1250");
          assert.strictEqual(form.get("refund_amount"), "1250");
          assert.strictEqual(
            form.get("metadata[key]"),
            "withdrawal-credit-sub_paid-in_proration"
          );
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
        yield* contracts.cancelAtPeriodEnd(
          workspaceId,
          "sub_paid",
          "request-2"
        );

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
        // Named after the request: another one, as after the cancellation
        // was undone, is another call to Stripe.
        assert.strictEqual(
          cancelled === undefined ? "" : headerOf(cancelled, "idempotency-key"),
          "cancel-sub_paid-request-2"
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

  it.effect(
    "tell a request Stripe refuses, which asking again will not change, from Stripe not answering",
    () =>
      Effect.gen(function* refusing() {
        const down = yield* fakeStripe({ failing: true });
        const up = yield* fakeStripe();

        const unanswered = yield* (yield* contractsOn(down.url))
          .cancelAtPeriodEnd(workspaceId, "sub_paid", "request-3")
          .pipe(Effect.flip);

        const refused = yield* (yield* contractsOn(up.url))
          .cancelAtPeriodEnd(workspaceId, "sub_missing", "request-3")
          .pipe(Effect.flip);

        assert.deepStrictEqual(
          [unanswered.permanent, refused.permanent],
          [false, true]
        );
      }).pipe(Effect.scoped)
  );
});
