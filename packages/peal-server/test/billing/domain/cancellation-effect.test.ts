import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import {
  cancellationEffect,
  renewalRefund,
} from "#billing/domain/cancellation-effect.ts";
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
        { desiredAt: Option.none(), receivedAt: at("2026-11-10T08:00:00Z") },
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
        { desiredAt: Option.none(), receivedAt: at("2026-11-10T08:00:00Z") },
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

  it("applies nothing to a contract that started after the request came", () => {
    // Sent on 10 November during a trial; a yearly plan ordered the day
    // after is another contract, which the request never spoke of.
    const orderedSince = subscriptionOf({
      ...paid,
      currentPeriodEnd: Option.some(at("2027-11-11T00:00:00Z")),
      currentPeriodStart: Option.some(at("2026-11-11T00:00:00Z")),
      startedAt: Option.some(at("2026-11-11T00:00:00Z")),
    });

    expect(
      cancellationEffect(
        orderedSince,
        { desiredAt: Option.none(), receivedAt: at("2026-11-10T08:00:00Z") },
        at("2026-12-09T08:00:00Z")
      ).pipe(
        Result.getFailure,
        Option.map(({ _tag }) => _tag)
      )
    ).toStrictEqual(Option.some("NothingToCancel"));
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
        { desiredAt: Option.none(), receivedAt: at("2026-11-30T22:00:00Z") },
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

  it("ends on the day asked for, when it is after the period paid for", () => {
    const asked = (desired: string) =>
      cancellationEffect(
        subscriptionOf(paid),
        {
          desiredAt: Option.some(at(desired)),
          receivedAt: at("2026-11-10T08:00:00Z"),
        },
        at("2026-11-10T08:00:01Z")
      ).pipe(Result.getSuccess);

    expect(asked("2027-02-15T00:00:00Z")).toStrictEqual(
      Option.some({ _tag: "onDate", endsAt: at("2027-02-15T00:00:00Z") })
    );

    // A day within the period paid for, which is not refunded: the period
    // runs to its end.
    for (const within of ["2026-11-20T00:00:00Z", "2026-12-01T00:00:00Z"]) {
      expect(asked(within)).toStrictEqual(
        Option.some({
          _tag: "atPeriodEnd",
          endsAt: at("2026-12-01T00:00:00Z"),
        })
      );
    }
  });

  it("keeps a plan that renewed since, when the day asked for is in the new period", () => {
    const renewed = subscriptionOf({
      ...paid,
      currentPeriodEnd: Option.some(at("2027-01-01T00:00:00Z")),
      currentPeriodStart: Option.some(at("2026-12-01T00:00:00Z")),
    });

    expect(
      cancellationEffect(
        renewed,
        {
          desiredAt: Option.some(at("2026-12-20T00:00:00Z")),
          receivedAt: at("2026-11-30T22:00:00Z"),
        },
        at("2026-12-02T09:00:00Z")
      ).pipe(Result.getSuccess)
    ).toStrictEqual(
      Option.some({ _tag: "atPeriodEnd", endsAt: at("2027-01-01T00:00:00Z") })
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
            {
              desiredAt: Option.none(),
              receivedAt: at("2026-11-10T08:00:00Z"),
            },
            at("2026-11-10T08:00:01Z")
          )
        )
      ).toBeTruthy();
    }
  });
});

describe(renewalRefund, () => {
  const since = at("2026-11-25T00:00:00Z");

  it("gives back a renewal charged after the request came, whole", () => {
    expect(
      renewalRefund(
        { lines: [{ amount: 1250, start: at("2026-12-01T00:00:00Z") }], paid: 1500 },
        since
      )
    ).toBe(1500);
  });

  it("gives back the renewal of an invoice that also settles a change of plan made before, and not what the change cost", () => {
    // A plan changed on 10 November, prorated onto the invoice of the
    // renewal of 1 December: 1,415 before tax, 1,698 with it.
    expect(
      renewalRefund(
        {
          lines: [
            { amount: -250, start: at("2026-11-10T00:00:00Z") },
            { amount: 415, start: at("2026-11-10T00:00:00Z") },
            { amount: 1250, start: at("2026-12-01T00:00:00Z") },
          ],
          paid: 1698,
        },
        since
      )
    ).toBe(1500);
  });

  it("gives back nothing of an invoice for periods that began before the request", () => {
    expect(
      renewalRefund(
        { lines: [{ amount: 1250, start: at("2026-11-01T00:00:00Z") }], paid: 1500 },
        since
      )
    ).toBe(0);
  });

  it("never gives back more than was paid, nor anything of an invoice without lines", () => {
    expect(
      renewalRefund(
        {
          lines: [
            { amount: -1000, start: at("2026-11-10T00:00:00Z") },
            { amount: 1250, start: at("2026-12-01T00:00:00Z") },
          ],
          paid: 300,
        },
        since
      )
    ).toBe(300);
    expect(renewalRefund({ lines: [], paid: 1500 }, since)).toBe(0);
  });
});
