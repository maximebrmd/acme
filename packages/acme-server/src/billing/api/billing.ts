import { Api, CurrentMember, Forbidden } from "acme-contract";
import type { Billing, PlanAllowances } from "acme-contract";
import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { BillingOverview } from "#billing/application/billing-overview.ts";
import type { Overview } from "#billing/application/billing-overview.ts";
import type { Allowances } from "#billing/domain/plans.ts";
import { actorOf } from "#shared/api/actor.ts";

const allowancesView = (allowances: Allowances): PlanAllowances => ({
  assistantRequests: Option.getOrNull(allowances.assistantRequests),
  channels: Option.getOrNull(allowances.channels),
  members: Option.getOrNull(allowances.members),
  scheduledPosts: Option.getOrNull(allowances.scheduledPosts),
});

const billingView = ({ entitlements, plans, usage }: Overview): Billing => ({
  allowances: allowancesView(entitlements.allowances),
  enabled: Option.isSome(entitlements.plan),
  plan: Option.getOrNull(entitlements.plan),
  plans: plans.map(({ allowances, plan }) => ({
    allowances: allowancesView(allowances),
    plan,
  })),
  subscription: entitlements.subscription.pipe(
    Option.map((subscription) => ({
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: Option.getOrNull(subscription.currentPeriodEnd),
      plan: subscription.plan,
      status: subscription.status,
    })),
    Option.getOrNull
  ),
  usage,
});

export const BillingHandlers = HttpApiBuilder.group(
  Api,
  "billing",
  Effect.fn(function* billingHandlers(handlers) {
    const overview = yield* BillingOverview;

    return handlers.handle("get", () =>
      Effect.gen(function* get() {
        const actor = actorOf(yield* CurrentMember);

        const found = yield* overview.of(actor).pipe(
          Effect.catchTags({
            DatabaseError: Effect.die,
            MissingPermission: () => Effect.fail(new Forbidden()),
          })
        );

        return billingView(found);
      })
    );
  })
);
