import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";

import { heldUntil, legalCutoffs } from "#legal/domain/legal-retention.ts";

const at = (iso: string) => DateTime.makeUnsafe(iso);

describe(heldUntil, () => {
  it("keeps the identity 5 years after the account closes, and how it signed in 1 year", () => {
    expect(heldUntil(at("2026-11-09T10:00:00Z"))).toStrictEqual({
      account: at("2027-11-09T10:00:00Z"),
      identity: at("2031-11-09T10:00:00Z"),
    });
  });
});

describe(legalCutoffs, () => {
  it("names the instants the purge compares with", () => {
    expect(legalCutoffs(at("2026-11-09T03:47:00Z"))).toStrictEqual({
      // Accounts closed before then no longer keep how they signed in.
      account: at("2025-11-09T03:47:00Z"),
      // Connections made before then are deleted.
      connections: at("2025-11-09T03:47:00Z"),
      // Answers to legal requests made before then are deleted.
      disclosures: at("2021-11-09T03:47:00Z"),
      // Accounts closed before then are deleted.
      identity: at("2021-11-09T03:47:00Z"),
    });
  });
});
