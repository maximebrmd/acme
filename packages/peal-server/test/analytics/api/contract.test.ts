import { describe, expect, it } from "@effect/vitest";
import { countedPlatforms as contractCountedPlatforms } from "peal-contract";

import { countedPlatforms } from "#analytics/domain/counted-platforms.ts";

describe("the contract", () => {
  it("lists the platforms the server reads counts on", () => {
    expect(contractCountedPlatforms).toStrictEqual(countedPlatforms);
  });
});
