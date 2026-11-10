import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { Subscription } from "#billing/domain/subscription.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { subscriptionOf } from "#test/billing/support.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);

const paid = {
  currentPeriodEnd: Option.some(at("2026-12-01T00:00:00Z")),
  plan: "starter",
  status: "active",
  workspaceId: WorkspaceIdSchema.make("7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0e"),
} as const;

describe(Subscription, () => {
  it("ends on no day while it renews", () => {
    expect(subscriptionOf(paid).endsAt).toStrictEqual(Option.none());
  });

  it("ends with its period once cancelled, or on the later day it was asked to end on", () => {
    expect(
      subscriptionOf({ ...paid, cancelAtPeriodEnd: true }).endsAt
    ).toStrictEqual(Option.some(at("2026-12-01T00:00:00Z")));
    expect(
      subscriptionOf({
        ...paid,
        cancelAt: Option.some(at("2027-02-16T00:00:00Z")),
        cancelAtPeriodEnd: true,
      }).endsAt
    ).toStrictEqual(Option.some(at("2027-02-16T00:00:00Z")));
  });
});
