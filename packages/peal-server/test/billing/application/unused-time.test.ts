import { DateTime, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { PaidInvoice } from "#billing/application/ports/stripe-contracts.ts";
import { movedCredits } from "#billing/application/unused-time.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);

const invoice = (
  linePeriods: NonNullable<PaidInvoice["linePeriods"]>,
  paid: number
): PaidInvoice => ({
  invoiceId: "in_synthetic",
  linePeriods,
  lines: [],
  paid: { amount: paid, currency: "eur" },
  periodEnd: Option.some(at("2026-12-01T00:00:00Z")),
  periodStart: Option.some(at("2026-10-16T00:00:00Z")),
});

describe("the unused time of a legacy plan's invoices", () => {
  it("credits each line over its own period, not the lines' joined span", () => {
    // A renewal that carries 10 of an earlier period's proration (October
    // 16th to November 1st) and 30 for November, the plan moved on
    // November 16th: half of November's 30 is unused, none of October's.
    const renewal = invoice(
      [
        {
          amount: 1000,
          end: at("2026-11-01T00:00:00Z"),
          start: at("2026-10-16T00:00:00Z"),
        },
        {
          amount: 3000,
          end: at("2026-12-01T00:00:00Z"),
          start: at("2026-11-01T00:00:00Z"),
        },
      ],
      4000
    );

    expect(movedCredits([renewal], at("2026-11-16T00:00:00Z"))).toStrictEqual([
      { amount: 1500, invoiceId: "in_synthetic", share: 0.375 },
    ]);
  });

  it("shares the tax as the lines do, and never credits more than was paid", () => {
    const taxed = invoice(
      [
        {
          amount: 1000,
          end: at("2026-12-01T00:00:00Z"),
          start: at("2026-11-01T00:00:00Z"),
        },
      ],
      1200
    );

    expect(movedCredits([taxed], at("2026-11-16T00:00:00Z"))).toStrictEqual([
      { amount: 600, invoiceId: "in_synthetic", share: 0.5 },
    ]);
    expect(movedCredits([taxed], at("2026-10-01T00:00:00Z"))).toStrictEqual([
      { amount: 1200, invoiceId: "in_synthetic", share: 1 },
    ]);
  });
});
