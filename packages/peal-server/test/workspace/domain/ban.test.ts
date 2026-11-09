import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { isBanned } from "#workspace/domain/ban.ts";

const now = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

describe(isBanned, () => {
  it("is false without a ban", () => {
    expect(isBanned(Option.none(), now)).toBeFalsy();
  });

  it("holds a ban without an end", () => {
    expect(
      isBanned(Option.some({ expiresAt: Option.none() }), now)
    ).toBeTruthy();
  });

  it("holds a ban until it ends", () => {
    const ban = {
      expiresAt: Option.some(DateTime.makeUnsafe("2026-11-09T12:00:01Z")),
    };

    expect(isBanned(Option.some(ban), now)).toBeTruthy();
  });

  it("lets a ban lapse once it ends", () => {
    const ban = { expiresAt: Option.some(now) };

    expect(isBanned(Option.some(ban), now)).toBeFalsy();
  });
});
