import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { HttpServer } from "effect/http";
import { HttpApiTest } from "effect/http-api";
import { Api, Forbidden, Unauthenticated } from "peal-contract";
import type { Member } from "peal-contract";

import { BillingOverview } from "#billing/application/billing-overview.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { BillingApiLive } from "#billing/container.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import type { Permission } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import {
  anonymousSecurityTest,
  securityTest,
} from "#workspace/api/security.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The billing endpoint on its use case, with the workspace's subscription
// and usage in memory. Each request acts as a member, as the
// WorkspaceAccess middleware would.

const workspaceId = WorkspaceIdSchema.make(
  "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f70"
);

const midnight = DateTime.makeUnsafe("2026-11-10T00:00:00Z");

const periodEnd = DateTime.makeUnsafe("2026-12-09T10:00:00Z");

// A Pro subscription, paid for, with synthetic Stripe ids.
const SubscriptionsTest = Layer.succeed(
  Subscriptions,
  Subscriptions.of({
    eraseWorkspace: () => Effect.void,
    ofWorkspace: () =>
      Effect.succeed([
        new Subscription({
          cancelAtPeriodEnd: false,
          currentPeriodEnd: Option.some(periodEnd),
          plan: "pro",
          status: "active",
          stripeCustomerId: "cus_synthetic",
          stripeSubscriptionId: "sub_synthetic",
          workspaceId,
        }),
      ]),
    record: () => Effect.succeed("recorded" as const),
  })
);

const UsageTest = Layer.succeed(
  WorkspaceUsage,
  WorkspaceUsage.of({
    of: () =>
      Effect.succeed({
        assistantRequests: { resetsAt: midnight, used: 4 },
        channels: 2,
        members: 1,
        scheduledPosts: { resetsAt: midnight, used: 12 },
      }),
  })
);

const overviewOn = (enabled: boolean) =>
  BillingOverview.layer.pipe(
    Layer.provide(UsageTest),
    Layer.provide(WorkspaceEntitlements.layer),
    Layer.provide(SubscriptionsTest),
    Layer.provide(Layer.succeed(BillingMode, BillingMode.of({ enabled })))
  );

const clientWith = <E, R>(
  security: Layer.Layer<Layer.Success<typeof anonymousSecurityTest>, E, R>
) =>
  HttpApiTest.groups(Api, ["billing"]).pipe(
    Effect.provide(
      Layer.mergeAll(
        BillingApiLive.pipe(Layer.provideMerge(security)),
        HttpServer.layerServices
      )
    )
  );

const memberWith = (permissions: readonly Permission[]): Member => ({
  permissions,
  principal: {
    _tag: "user",
    impersonatedBy: null,
    userId: "6f7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
  },
  workspaceId,
});

const as = (permissions: readonly Permission[]) =>
  clientWith(securityTest(memberWith(permissions)));

const params = { workspaceId };

layer(overviewOn(true))("the billing endpoint on a server that bills", (it) => {
  it.effect(
    "show a member with billing:read the plan, its limits, the usage and every plan",
    () =>
      Effect.gen(function* shows() {
        const client = yield* as(permissionsFor("admin"));
        const billing = yield* client.billing.get({ params });

        assert.isTrue(billing.enabled);
        assert.strictEqual(billing.plan, "pro");
        assert.deepStrictEqual(billing.subscription, {
          cancelAtPeriodEnd: false,
          currentPeriodEnd: periodEnd,
          plan: "pro",
          status: "active",
        });
        assert.deepStrictEqual(billing.allowances, {
          assistantRequests: 100,
          channels: 10,
          members: 5,
          scheduledPosts: 300,
        });
        assert.deepStrictEqual(
          billing.plans.map(({ plan }) => plan),
          ["free", "pro", "business"]
        );
        assert.deepStrictEqual(billing.usage.scheduledPosts, {
          resetsAt: midnight,
          used: 12,
        });

        // Stripe's ids stay on the server.
        assert.notInclude(JSON.stringify(billing), "cus_synthetic");
        assert.notInclude(JSON.stringify(billing), "sub_synthetic");
      })
  );

  it.effect("answer 403 to a member without billing:read", () =>
    Effect.gen(function* forbidden() {
      for (const role of ["editor", "contributor", "viewer"]) {
        const client = yield* as(permissionsFor(role));
        const refused = yield* Effect.flip(client.billing.get({ params }));

        assert.instanceOf(refused, Forbidden, role);
      }
    })
  );

  it.effect("answer 401 without credentials", () =>
    Effect.gen(function* anonymous() {
      const client = yield* clientWith(anonymousSecurityTest);
      const refused = yield* Effect.flip(client.billing.get({ params }));

      assert.instanceOf(refused, Unauthenticated);
    })
  );
});

layer(overviewOn(false))(
  "the billing endpoint on a server that does not bill",
  (it) => {
    it.effect("show no plan, and limit nothing", () =>
      Effect.gen(function* unmetered() {
        const client = yield* as(permissionsFor("owner"));
        const billing = yield* client.billing.get({ params });

        assert.isFalse(billing.enabled);
        assert.isNull(billing.plan);
        assert.isNull(billing.subscription);
        assert.deepStrictEqual(billing.plans, []);
        assert.deepStrictEqual(billing.allowances, {
          assistantRequests: null,
          channels: null,
          members: null,
          scheduledPosts: null,
        });
      })
    );
  }
);
