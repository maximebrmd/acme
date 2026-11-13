// Usage at Stripe: the meter events and subscription changes billing
// sends, against stripe-mock for their shape (it checks each request
// against Stripe's API) and a stand-in for what stripe-mock never answers:
// refusals, limits, and a subscription's items.
import { assert, layer } from "@effect/vitest";
import {
  Config,
  ConfigProvider,
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
} from "effect";

import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import type {
  MeterEvent,
  ReportOutcome,
} from "#billing/application/ports/usage-billing.ts";
import {
  itemChanges,
  StripeUsageBillingLive,
} from "#billing/infrastructure/stripe-usage-billing.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import {
  dropped,
  headerOf,
  json,
  platformServer,
  textOf,
} from "#test/publishing/fakes/platform-server.ts";
import type {
  JsonValue,
  PlatformAnswer,
  PlatformRequest,
} from "#test/publishing/fakes/platform-server.ts";

const workspaceId = WorkspaceIdSchema.make(
  "4b5c6d7e-8f90-4a1b-9c2d-3e4f5a6b7c8d"
);

const stripeMockUrl = Config.String("STRIPE_MOCK_URL").pipe(
  Config.withDefault("http://127.0.0.1:12111")
);

const usageOn = (apiUrl: string) =>
  Layer.build(
    StripeUsageBillingLive.pipe(
      Layer.provide(
        ConfigProvider.layer(
          ConfigProvider.fromUnknown({
            STRIPE_API_URL: apiUrl,
            // stripe-mock takes a key of letters and digits after the prefix.
            STRIPE_SECRET_KEY: "sk_test_synthetic",
            STRIPE_WEBHOOK_SECRET: "whsec_synthetic_usage",
          })
        )
      )
    )
  ).pipe(Effect.map(Context.get(UsageBilling)));

const event = (identifier: string): MeterEvent => ({
  eventName: "peal_accounts",
  identifier,
  stripeCustomerId: "cus_synthetic_usage",
  timestamp: DateTime.makeUnsafe("2026-11-13T12:00:00Z"),
  value: 3,
});

// A refusal Stripe would answer, its code given or not.
const error = (status: number, type: string, code?: string) =>
  json(
    {
      error:
        code === undefined
          ? { message: "synthetic", type }
          : { code, message: "synthetic", type },
    },
    status
  );

const list = (data: readonly JsonValue[], url: string) =>
  json({ data: [...data], has_more: false, object: "list", url });

const price = (id: string, product: string, lookupKey: string | null) => ({
  id,
  lookup_key: lookupKey,
  object: "price",
  product,
});

// The catalogue's current prices: the accounts' replaced since the
// subscription was made (`price_accounts_new`, its old one without a key
// now), the others as they were.
const current = [
  price("price_accounts_new", "prod_accounts", "peal_accounts"),
  price("price_messages", "prod_messages", "peal_outbound_messages"),
  price("price_ads", "prod_ads", "peal_managed_ads"),
  price("price_requests", "prod_requests", "peal_assistant_requests"),
  price("price_images", "prod_images", "peal_assistant_images"),
  price("price_x", "prod_x", "peal_x_api"),
];

const posts = (server: {
  readonly requests: () => readonly PlatformRequest[];
}) => server.requests().filter(({ method }) => method === "POST");

layer(Layer.empty)("usage at Stripe", (it) => {
  it.effect(
    "sends a meter event and a subscription's threshold as Stripe's API takes them",
    () =>
      Effect.gen(function* takenByStripe() {
        const usage = yield* usageOn(yield* stripeMockUrl);

        assert.deepStrictEqual(yield* usage.report(event("acc:shape:1")), {
          _tag: "sent",
        });

        yield* usage.setThreshold(
          workspaceId,
          "sub_synthetic",
          Option.some(10_000)
        );
        yield* usage.setThreshold(workspaceId, "sub_synthetic", Option.none());
      }).pipe(Effect.scoped)
  );

  it.effect(
    "names the event, its customer, its value and its second, under its identifier",
    () =>
      Effect.gen(function* sent() {
        const stripe = yield* platformServer(() =>
          json({ identifier: "acc:sent:1", object: "billing.meter_event" })
        );

        const usage = yield* usageOn(stripe.url);

        yield* usage.report(event("acc:sent:1"));

        const [request] = stripe.requests();
        const form = new URLSearchParams(request ? textOf(request) : "");

        assert.strictEqual(request?.path, "/v1/billing/meter_events");
        assert.deepStrictEqual(Object.fromEntries(form), {
          event_name: "peal_accounts",
          identifier: "acc:sent:1",
          "payload[stripe_customer_id]": "cus_synthetic_usage",
          "payload[value]": "3",
          timestamp: "1794571200",
        });
        assert.strictEqual(
          request ? headerOf(request, "idempotency-key") : "",
          // What is sent, identifier and timestamp: a retry with the
          // timestamp the row keeps is the same request.
          "acc:sent:1:1794571200"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "tries a limited, failed or unanswered event again, pauses on what refuses the account, and keeps only an event's own refusal",
    () =>
      Effect.gen(function* refusals() {
        // What each identifier is answered, and what it becomes.
        const cases: readonly (readonly [
          string,
          PlatformAnswer,
          ReportOutcome,
        ])[] = [
          ["acc:dropped", dropped, { _tag: "retry", reason: "unavailable" }],
          [
            "acc:failed",
            error(500, "api_error"),
            { _tag: "retry", reason: "unavailable" },
          ],
          [
            "acc:limited",
            error(429, "invalid_request_error", "rate_limit"),
            { _tag: "retry", reason: "unavailable" },
          ],
          [
            "acc:in-use",
            error(409, "idempotency_error", "idempotency_key_in_use"),
            { _tag: "retry", reason: "unavailable" },
          ],
          // The key, its permissions, the account, a request Stripe will
          // not take under its key: nothing of the event's own.
          [
            "acc:key",
            error(401, "invalid_request_error"),
            { _tag: "retry", reason: "refusing" },
          ],
          [
            "acc:permission",
            error(403, "invalid_request_error", "secret_key_required"),
            { _tag: "retry", reason: "refusing" },
          ],
          [
            "acc:mismatch",
            error(400, "idempotency_error"),
            { _tag: "retry", reason: "refusing" },
          ],
          [
            "acc:meter",
            error(400, "invalid_request_error", "resource_missing"),
            { _tag: "retry", reason: "refusing" },
          ],
          [
            "acc:unknown",
            error(418, "card_error", "synthetic_code"),
            { _tag: "retry", reason: "refusing" },
          ],
          // The event's own: its value, its timestamp, its customer.
          [
            "acc:refused",
            error(400, "invalid_request_error", "parameter_invalid_integer"),
            { _tag: "refused", code: "parameter_invalid_integer" },
          ],
          [
            "acc:too-old",
            error(400, "invalid_request_error", "timestamp_too_far_in_past"),
            { _tag: "refused", code: "timestamp_too_far_in_past" },
          ],
        ];

        const answers = new Map(
          cases.map(([identifier, answer]) => [identifier, answer] as const)
        );

        const stripe = yield* platformServer(
          (request) =>
            answers.get(
              new URLSearchParams(textOf(request)).get("identifier") ?? ""
            ) ?? json({ object: "billing.meter_event" })
        );

        const usage = yield* usageOn(stripe.url);

        assert.deepStrictEqual(
          yield* Effect.all(
            cases.map(([identifier]) => usage.report(event(identifier)))
          ),
          cases.map((each) => each[2])
        );

        // Each answered sent once: the next run tries again, not the
        // client.
        const sentTimes = (identifier: string) =>
          stripe
            .requests()
            .filter(
              (request) =>
                new URLSearchParams(textOf(request)).get("identifier") ===
                identifier
            ).length;

        // The connection dropped may be opened again underneath, under the
        // same idempotency key, so the same request.
        const answered = cases.filter(
          ([identifier]) => identifier !== "acc:dropped"
        );

        assert.deepStrictEqual(
          answered.map(([identifier]) => sentTimes(identifier)),
          answered.map(() => 1)
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "adds each missing item once, and moves one whose price lost its key",
    () =>
      Effect.gen(function* items() {
        // What the subscription holds: the old accounts' price and the
        // messages', then, once the changes are made, all six.
        let held: readonly JsonValue[] = [
          {
            id: "si_accounts",
            object: "subscription_item",
            price: price("price_accounts_old", "prod_accounts", null),
          },
          {
            id: "si_messages",
            object: "subscription_item",
            price: current[1] ?? null,
          },
        ];

        const stripe = yield* platformServer(({ method, path }) => {
          if (method === "GET" && path === "/v1/prices") {
            return list(current, path);
          }

          if (method === "GET" && path === "/v1/subscription_items") {
            return list(held, path);
          }

          return json({ id: "si_synthetic", object: "subscription_item" });
        });

        const usage = yield* usageOn(stripe.url);

        assert.deepStrictEqual(
          yield* usage.ensureItems(workspaceId, "sub_synthetic"),
          { added: 4, replaced: 1 }
        );

        const changes = posts(stripe).map((request) => ({
          form: Object.fromEntries(new URLSearchParams(textOf(request))),
          key: headerOf(request, "idempotency-key"),
          path: request.path,
        }));

        assert.deepStrictEqual(changes[0], {
          form: { price: "price_accounts_new", proration_behavior: "none" },
          key: "items-sub_synthetic-price_accounts_new",
          path: "/v1/subscription_items/si_accounts",
        });
        assert.deepStrictEqual(
          changes.slice(1).map(({ form }) => form),
          ["price_ads", "price_requests", "price_images", "price_x"].map(
            (id) => ({
              price: id,
              proration_behavior: "none",
              subscription: "sub_synthetic",
            })
          )
        );

        // Kept: nothing more to do.
        held = current.map((each, index) => ({
          id: `si_${index}`,
          object: "subscription_item",
          price: each,
        }));

        assert.deepStrictEqual(
          yield* usage.ensureItems(workspaceId, "sub_synthetic"),
          { added: 0, replaced: 0 }
        );
        assert.lengthOf(posts(stripe), 5);
      }).pipe(Effect.scoped)
  );

  it.effect("reads a subscription's items through stripe-mock", () =>
    Effect.gen(function* itemsRead() {
      const usage = yield* usageOn(yield* stripeMockUrl);
      const kept = yield* usage.ensureItems(workspaceId, "sub_synthetic");

      // stripe-mock answers its one canned price to the lookup and holds
      // it on its one canned item: both read, nothing to change.
      assert.deepStrictEqual(kept, { added: 0, replaced: 0 });
    }).pipe(Effect.scoped)
  );

  it("leaves a subscription that holds every price as it is", () => {
    assert.deepStrictEqual(
      itemChanges(
        current,
        current.map((each, index) => ({ id: `si_${index}`, price: each }))
      ),
      []
    );
  });
});
