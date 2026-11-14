// The legacy plans' retirement on their subscriptions' rows: only legacy
// plans that may still give their plan are listed, a day kept stays, and
// each is told once.
import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";

import { PlanRetirements } from "#billing/application/ports/plan-retirements.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { SubscriptionChange } from "#billing/domain/subscription-change.ts";
import { Subscription } from "#billing/domain/subscription.ts";
import type { SubscriptionStatus } from "#billing/domain/subscription.ts";
import {
  DrizzlePlanRetirementsLive,
  DrizzleSubscriptionsLive,
} from "#billing/infrastructure/drizzle-subscriptions.ts";
import { Ids } from "#shared/application/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

const RepositoryTest = Layer.mergeAll(
  DrizzleSubscriptionsLive,
  DrizzlePlanRetirementsLive
).pipe(Layer.provideMerge(DatabaseTest));

const at = (iso: string) => DateTime.makeUnsafe(iso);

// A subscription of a workspace of its own, with an id unique to the run.
const subscribed = (plan: PaidPlan, status: SubscriptionStatus) =>
  Effect.gen(function* subscribedOnce() {
    const workspaceId = yield* freshWorkspace;
    const id = `sub_synthetic_${yield* Ids.use((ids) => ids.next)}`;

    yield* Subscriptions.use((subscriptions) =>
      subscriptions.record(
        new SubscriptionChange({
          eventId: `evt_synthetic_${id}`,
          occurredAt: at("2026-11-14T10:00:00Z"),
          subscription: new Subscription({
            cancelAtPeriodEnd: false,
            currentPeriodEnd: Option.some(at("2026-12-01T00:00:00Z")),
            currentPeriodStart: Option.some(at("2026-11-01T00:00:00Z")),
            interval: "month",
            plan,
            startedAt: Option.none(),
            status,
            stripeCustomerId: `cus_${id}`,
            stripeSubscriptionId: id,
            trialEnd: Option.none(),
            workspaceId,
          }),
        })
      )
    );

    return id;
  });

const ids = (found: readonly { readonly subscription: Subscription }[]) =>
  found.map(({ subscription }) => subscription.stripeSubscriptionId);

layer(RepositoryTest)("the legacy plans' retirement in Postgres", (it) => {
  it.effect(
    "lists legacy plans that may still give their plan, keeps the day Stripe took and when it was first applied, and tells once",
    () =>
      Effect.gen(function* retirements() {
        const retire = yield* PlanRetirements;
        const starter = yield* subscribed("starter", "active");
        const ended = yield* subscribed("pro", "canceled");
        const perAccount = yield* subscribed("payAsYouGo", "active");

        const legacy = ids(yield* retire.legacy);

        assert.include(legacy, starter);
        assert.notInclude(legacy, ended);
        assert.notInclude(legacy, perAccount);
        assert.notInclude(ids(yield* retire.untold), starter);

        const first = at("2026-11-14T10:00:00Z");
        const day = at("2027-01-01T00:00:00Z");

        yield* retire.retire(starter, at("2026-12-16T00:00:00Z"), first);
        // Moved later, as when its notice went out late: the day is the
        // new one, and when it was first applied stays.
        yield* retire.retire(starter, day, at("2026-11-17T10:00:00Z"));

        assert.deepStrictEqual(
          yield* retire.retiresAt(starter),
          Option.some(day)
        );

        const untold = (yield* retire.untold).find(
          ({ subscription }) => subscription.stripeSubscriptionId === starter
        );

        assert.deepStrictEqual(untold?.retiresAt, Option.some(day));
        assert.deepStrictEqual(untold?.retiredAt, Option.some(first));

        yield* retire.told(starter, at("2026-11-14T11:00:00Z"));
        yield* retire.told(starter, at("2026-11-14T12:00:00Z"));

        assert.notInclude(ids(yield* retire.untold), starter);

        const kept = (yield* retire.legacy).find(
          ({ subscription }) => subscription.stripeSubscriptionId === starter
        );

        assert.deepStrictEqual(
          kept?.toldAt,
          Option.some(at("2026-11-14T11:00:00Z"))
        );
      })
  );
});
