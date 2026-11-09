import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { mayWithdraw, refundOf } from "#billing/domain/withdrawal.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { subscriptionOf } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
);

const at = (iso: string) => DateTime.makeUnsafe(iso);

const startedFields = {
  currentPeriodEnd: Option.some(at("2026-12-01T00:00:00Z")),
  currentPeriodStart: Option.some(at("2026-11-01T00:00:00Z")),
  plan: "starter",
  startedAt: Option.some(at("2026-11-01T00:00:00Z")),
  status: "active",
  workspaceId,
} as const;

const started = subscriptionOf(startedFields);

describe(mayWithdraw, () => {
  it("allows a withdrawal for 14 days from the contract's start", () => {
    expect(
      mayWithdraw(started, at("2026-11-14T23:59:59Z")).pipe(Result.getSuccess)
    ).toStrictEqual(Option.some(at("2026-11-15T00:00:00Z")));

    expect(
      mayWithdraw(started, at("2026-11-15T00:00:00Z")).pipe(
        Result.getFailure,
        Option.map(({ reason }) => reason)
      )
    ).toStrictEqual(Option.some("expired"));
  });

  it("counts the trial as the contract's start", () => {
    const trial = subscriptionOf({
      ...startedFields,
      startedAt: Option.some(at("2026-11-05T00:00:00Z")),
      status: "trialing",
    });

    expect(
      Result.isSuccess(mayWithdraw(trial, at("2026-11-18T00:00:00Z")))
    ).toBeTruthy();
  });

  it("allows a withdrawal from a subscription already cancelled", () => {
    const cancelled = subscriptionOf({
      ...startedFields,
      cancelAtPeriodEnd: true,
    });

    expect(
      Result.isSuccess(mayWithdraw(cancelled, at("2026-11-02T00:00:00Z")))
    ).toBeTruthy();
  });

  it.each([{ status: "canceled" as const }, { status: "unpaid" as const }])(
    "refuses a subscription $status",
    (fields) => {
      expect(
        mayWithdraw(
          subscriptionOf({ ...startedFields, ...fields }),
          at("2026-11-02T00:00:00Z")
        ).pipe(
          Result.getFailure,
          Option.map(({ reason }) => reason)
        )
      ).toStrictEqual(Option.some("notSubscribed"));
    }
  );
});

describe(refundOf, () => {
  const period = {
    end: at("2026-12-01T00:00:00Z"),
    paid: 900,
    start: at("2026-11-01T00:00:00Z"),
  };

  it("refunds the part of the period not supplied, rounded down to the cent", () => {
    // 3 days of 30 used: 27/30 of 900.
    expect(refundOf(period, at("2026-11-04T00:00:00Z"))).toBe(810);
    // Half a day used.
    expect(refundOf(period, at("2026-11-01T12:00:00Z"))).toBe(885);
  });

  it("refunds everything before the period, nothing after it or of nothing paid", () => {
    expect(refundOf(period, at("2026-10-31T00:00:00Z"))).toBe(900);
    expect(refundOf(period, at("2026-12-02T00:00:00Z"))).toBe(0);
    expect(refundOf({ ...period, paid: 0 }, at("2026-11-04T00:00:00Z"))).toBe(
      0
    );
  });
});
