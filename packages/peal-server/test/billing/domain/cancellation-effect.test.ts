import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { cancellationEffect } from "#billing/domain/cancellation-effect.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { subscriptionOf } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"
);

const at = (iso: string) => DateTime.makeUnsafe(iso);

const paid = {
  currentPeriodEnd: Option.some(at("2026-12-01T00:00:00Z")),
  currentPeriodStart: Option.some(at("2026-11-01T00:00:00Z")),
  plan: "starter",
  startedAt: Option.some(at("2026-10-01T00:00:00Z")),
  status: "active",
  workspaceId,
} as const;

describe(cancellationEffect, () => {
  it("ends a paid plan with the period paid for", () => {
    expect(
      cancellationEffect(
        subscriptionOf(paid),
        at("2026-11-10T08:00:00Z"),
        at("2026-11-10T08:00:01Z")
      ).pipe(Result.getSuccess)
    ).toStrictEqual(
      Option.some({ _tag: "atPeriodEnd", endsAt: at("2026-12-01T00:00:00Z") })
    );
  });

  it("ends a trial at once", () => {
    expect(
      cancellationEffect(
        subscriptionOf({ ...paid, status: "trialing" }),
        at("2026-11-10T08:00:00Z"),
        at("2026-11-10T08:00:01Z")
      ).pipe(Result.getSuccess)
    ).toStrictEqual(
      Option.some({
        _tag: "now",
        endsAt: at("2026-11-10T08:00:01Z"),
        refundSince: Option.none(),
      })
    );
  });

  it("ends at once, and refunds the renewal, a plan that renewed after the request came", () => {
    // Received on 30 November, applied on 2 December: the period it was
    // received in ended on 1 December, and the renewal was charged since.
    const renewed = subscriptionOf({
      ...paid,
      currentPeriodEnd: Option.some(at("2027-01-01T00:00:00Z")),
      currentPeriodStart: Option.some(at("2026-12-01T00:00:00Z")),
    });

    expect(
      cancellationEffect(
        renewed,
        at("2026-11-30T22:00:00Z"),
        at("2026-12-02T09:00:00Z")
      ).pipe(Result.getSuccess)
    ).toStrictEqual(
      Option.some({
        _tag: "now",
        endsAt: at("2026-12-02T09:00:00Z"),
        refundSince: Option.some(at("2026-11-30T22:00:00Z")),
      })
    );
  });

  it("has nothing to cancel of a subscription already set to end, or over", () => {
    for (const subscription of [
      subscriptionOf({ ...paid, cancelAtPeriodEnd: true }),
      subscriptionOf({ ...paid, status: "canceled" }),
    ]) {
      expect(
        Result.isFailure(
          cancellationEffect(
            subscription,
            at("2026-11-10T08:00:00Z"),
            at("2026-11-10T08:00:01Z")
          )
        )
      ).toBeTruthy();
    }
  });
});
