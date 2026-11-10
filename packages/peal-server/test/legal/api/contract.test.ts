import { describe, expect, it } from "@effect/vitest";
import { LegalCoverSchema, legalDisclosureYears } from "peal-contract";

import { legalRetention } from "#legal/domain/legal-retention.ts";
import { LegalCoverSchema as DomainCoverSchema } from "#legal/domain/legal-scope.ts";

describe("the contract", () => {
  it("lists what a legal request may cover as the domain does", () => {
    expect(LegalCoverSchema.literals).toStrictEqual(DomainCoverSchema.literals);
  });

  it("says how long each answer to a legal request is kept, as the purge has it", () => {
    expect(legalDisclosureYears).toBe(legalRetention.disclosures.years);
  });
});
