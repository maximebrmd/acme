import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { auditCutoffs, isExpired } from "#staff/domain/audit-retention.ts";

const now = DateTime.makeUnsafe("2026-11-09T03:00:00Z");

const at = (iso: string) => DateTime.makeUnsafe(iso);

const ban = (start: string, end: Option.Option<string>) => ({
  action: "ban" as const,
  at: at(start),
  banExpiresAt: end.pipe(Option.map(at)),
  hasTarget: true,
  liftedAt: Option.none(),
});

describe(isExpired, () => {
  it("keeps staff actions 12 months, impersonations' records included", () => {
    for (const action of [
      "impersonate",
      "impersonatedChange",
      "impersonationEnded",
      "stopImpersonating",
      "revokeSessions",
      "resendVerification",
    ] as const) {
      expect(
        isExpired(
          {
            action,
            at: at("2025-11-10T00:00:00Z"),
            banExpiresAt: Option.none(),
            hasTarget: true,
            liftedAt: Option.none(),
          },
          now
        )
      ).toBeFalsy();
      expect(
        isExpired(
          {
            action,
            at: at("2025-11-08T00:00:00Z"),
            banExpiresAt: Option.none(),
            hasTarget: true,
            liftedAt: Option.none(),
          },
          now
        )
      ).toBeTruthy();
    }
  });

  it("keeps bans 5 years, and 12 months past a ban's end when that is later", () => {
    expect(
      isExpired(ban("2022-01-01T00:00:00Z", Option.none()), now)
    ).toBeFalsy();
    // A short ban stays 5 years, the time its user has to sue over it
    // (art. 2224 of the Code civil).
    expect(
      isExpired(
        ban("2022-01-01T00:00:00Z", Option.some("2022-02-01T00:00:00Z")),
        now
      )
    ).toBeFalsy();
    expect(
      isExpired(
        ban("2021-11-01T00:00:00Z", Option.some("2021-12-01T00:00:00Z")),
        now
      )
    ).toBeTruthy();
  });

  it("keeps a ban that lasted longer 12 months past its end", () => {
    // A ban that ended less than a year ago stays, however old.
    expect(
      isExpired(
        ban("2020-01-01T00:00:00Z", Option.some("2026-01-01T00:00:00Z")),
        now
      )
    ).toBeFalsy();
    expect(
      isExpired(
        ban("2020-01-01T00:00:00Z", Option.some("2025-06-01T00:00:00Z")),
        now
      )
    ).toBeTruthy();
    expect(
      isExpired(
        {
          action: "unban",
          at: at("2022-01-01T00:00:00Z"),
          banExpiresAt: Option.none(),
          hasTarget: true,
          liftedAt: Option.none(),
        },
        now
      )
    ).toBeFalsy();
  });

  it("keeps a ban until lifted while it holds, and 12 months past its lifting", () => {
    const forGood = {
      action: "ban" as const,
      at: at("2020-01-01T00:00:00Z"),
      banExpiresAt: Option.none(),
      hasTarget: true,
      liftedAt: Option.none(),
    };

    // Still in force, however old: the record answers for it.
    expect(isExpired(forGood, now)).toBeFalsy();
    expect(
      isExpired(
        { ...forGood, liftedAt: Option.some(at("2026-01-01T00:00:00Z")) },
        now
      )
    ).toBeFalsy();
    expect(
      isExpired(
        { ...forGood, liftedAt: Option.some(at("2025-06-01T00:00:00Z")) },
        now
      )
    ).toBeTruthy();
    // The account was closed: nothing holds any more.
    expect(isExpired({ ...forGood, hasTarget: false }, now)).toBeTruthy();
    expect(
      isExpired(
        {
          ...forGood,
          at: at("2022-01-01T00:00:00Z"),
          hasTarget: false,
        },
        now
      )
    ).toBeFalsy();
  });

  it("names the instants the purge compares with", () => {
    expect(auditCutoffs(now)).toStrictEqual({
      bans: at("2021-11-09T03:00:00Z"),
      general: at("2025-11-09T03:00:00Z"),
    });
  });

  it("keeps an action added since for 12 months, like the others", () => {
    expect(
      isExpired(
        {
          action: "somethingNew",
          at: at("2025-12-01T00:00:00Z"),
          banExpiresAt: Option.none(),
          hasTarget: true,
          liftedAt: Option.none(),
        },
        now
      )
    ).toBeFalsy();
  });
});
