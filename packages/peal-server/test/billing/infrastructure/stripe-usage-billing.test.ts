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
import type { MeterEvent } from "#billing/application/ports/usage-billing.ts";
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
          "acc:sent:1"
        );
      }).pipe(Effect.scoped)
  );

  it.effect(
    "tries a limited, failed or unanswered event again, and keeps a refusal's code",
    () =>
      Effect.gen(function* refusals() {
        const answers = new Map<string, PlatformAnswer>([
          ["acc:dropped", dropped],
          [
            "acc:failed",
            json({ error: { message: "synthetic", type: "api_error" } }, 500),
          ],
          [
            "acc:limited",
            json(
              {
                error: {
                  code: "rate_limit",
                  message: "synthetic",
                  type: "invalid_request_error",
                },
              },
              429
            ),
          ],
          [
            "acc:refused",
            json(
              {
                error: {
                  code: "parameter_invalid_integer",
                  message: "synthetic",
                  type: "invalid_request_error",
                },
              },
              400
            ),
          ],
        ]);

        const stripe = yield* platformServer(
          (request) =>
            answers.get(
              new URLSearchParams(textOf(request)).get("identifier") ?? ""
            ) ?? json({ object: "billing.meter_event" })
        );

        const usage = yield* usageOn(stripe.url);

        assert.deepStrictEqual(
          yield* Effect.all(
            ["acc:dropped", "acc:failed", "acc:limited", "acc:refused"].map(
              (identifier) => usage.report(event(identifier))
            )
          ),
          [
            { _tag: "retry" },
            { _tag: "retry" },
            { _tag: "retry" },
            { _tag: "refused", code: "parameter_invalid_integer" },
          ]
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
