import { DateTime } from "effect";
import { describe, expect, it } from "vitest";

import {
  requestPolicy,
  standingOf,
  windowStart,
} from "#activity/domain/rate-limit.ts";

const policy = requestPolicy(3);

const at = (time: string) => DateTime.makeUnsafe(`2026-11-10T${time}Z`);

describe("a credential's standing in its window", () => {
  it("counts in fixed windows that start on the minute", () => {
    expect(DateTime.formatIso(windowStart(policy, at("10:04:42.500")))).toBe(
      "2026-11-10T10:04:00.000Z"
    );
    expect(DateTime.formatIso(windowStart(policy, at("10:05:00.000")))).toBe(
      "2026-11-10T10:05:00.000Z"
    );
    // Before 1970 too, where a remainder would round the other way.
    expect(
      DateTime.formatIso(
        windowStart(policy, DateTime.makeUnsafe("1900-01-01T00:00:18Z"))
      )
    ).toBe("1900-01-01T00:00:00.000Z");
  });

  it("allows up to the limit, and says what is left and when it starts again", () => {
    expect(standingOf(policy, 1, at("10:04:18"))).toStrictEqual({
      allowed: true,
      limit: 3,
      remaining: 2,
      resetAfterSeconds: 42,
      windowSeconds: 60,
    });

    expect(standingOf(policy, 3, at("10:04:18")).allowed).toBeTruthy();
    expect(standingOf(policy, 3, at("10:04:18")).remaining).toBe(0);
  });

  it("refuses past the limit, until the window ends", () => {
    const refused = standingOf(policy, 4, at("10:04:59.200"));

    expect(refused.allowed).toBeFalsy();
    expect(refused.remaining).toBe(0);
    // Never zero: a client told to wait waits a second at least.
    expect(refused.resetAfterSeconds).toBe(1);
  });
});
