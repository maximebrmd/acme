import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { reminderKey, reminderOf } from "#billing/domain/reminders.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { subscriptionOf } from "#test/billing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"
);

const at = (iso: string) => DateTime.makeUnsafe(iso);

const renewsAt = at("2027-01-31T00:00:00Z");

const yearlyFields = {
  currentPeriodEnd: Option.some(renewsAt),
  interval: "year",
  plan: "business",
  status: "active",
  workspaceId,
} as const;

const yearly = subscriptionOf(yearlyFields);

const tagOf = (now: string, subscription = yearly) =>
  reminderOf(subscription, at(now)).pipe(Option.map(({ _tag }) => _tag));

describe(reminderOf, () => {
  it("reminds a yearly plan between three months and one month before it renews", () => {
    // It renews on 31 January: one month before is 31 December, which 30
    // days before (1 January) would miss.
    expect(tagOf("2026-12-16T00:00:00Z")).toStrictEqual(Option.none());
    expect(tagOf("2026-12-17T00:00:00Z")).toStrictEqual(Option.some("renewal"));
    expect(tagOf("2026-12-29T23:00:00Z")).toStrictEqual(Option.some("renewal"));
    expect(tagOf("2026-12-30T00:00:00Z")).toStrictEqual(Option.none());
  });

  it("reminds no monthly plan, nor one already cancelled", () => {
    expect(
      tagOf(
        "2026-12-20T00:00:00Z",
        subscriptionOf({ ...yearlyFields, interval: "month" })
      )
    ).toStrictEqual(Option.none());
    expect(
      tagOf(
        "2026-12-20T00:00:00Z",
        subscriptionOf({ ...yearlyFields, cancelAtPeriodEnd: true })
      )
    ).toStrictEqual(Option.none());
  });

  it("reminds a trial in its last three days", () => {
    const trial = subscriptionOf({
      plan: "pro",
      status: "trialing",
      trialEnd: Option.some(at("2026-11-23T10:00:00Z")),
      workspaceId,
    });

    expect(tagOf("2026-11-20T09:00:00Z", trial)).toStrictEqual(Option.none());
    expect(tagOf("2026-11-20T11:00:00Z", trial)).toStrictEqual(
      Option.some("trialEnding")
    );
    expect(tagOf("2026-11-23T11:00:00Z", trial)).toStrictEqual(Option.none());
  });

  it("keys each renewal apart, so a yearly plan is reminded every year", () => {
    const now = at("2026-12-20T00:00:00Z");
    const first = reminderOf(yearly, now);

    const next = reminderOf(
      subscriptionOf({
        ...yearlyFields,
        currentPeriodEnd: Option.some(at("2028-01-31T00:00:00Z")),
      }),
      at("2027-12-20T00:00:00Z")
    );

    expect(first.pipe(Option.map(reminderKey))).not.toStrictEqual(
      next.pipe(Option.map(reminderKey))
    );
  });
});
