import { describe, expect, it } from "@effect/vitest";
import {
  StaffActionSchema,
  StaffRefusalSchema,
  maxStaffReasonLength,
} from "acme-contract";

import { StaffActionSchema as ServerActions } from "#staff/domain/staff-action.ts";
import { maxReasonLength } from "#staff/domain/staff-reason.ts";
import { StaffRefusalSchema as ServerRefusals } from "#staff/domain/staff-refusal.ts";

// The contract copies the staff context's vocabularies: they stay equal.
describe("the staff contract", () => {
  it("lists the actions and refusals the server has", () => {
    expect(StaffActionSchema.literals).toStrictEqual(ServerActions.literals);
    expect(StaffRefusalSchema.literals).toStrictEqual(ServerRefusals.literals);
    expect(maxStaffReasonLength).toBe(maxReasonLength);
  });
});
