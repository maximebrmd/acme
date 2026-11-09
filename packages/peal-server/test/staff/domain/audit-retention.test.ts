import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import { auditCutoffs, isExpired } from "#staff/domain/audit-retention.ts";

const now = DateTime.makeUnsafe("2026-11-09T03:00:00Z");

const at = (iso: string) => DateTime.makeUnsafe(iso);

describe(isExpired, () => {
  it("keeps staff actions 12 months", () => {
    for (const action of [
      "impersonate",
      "revokeSessions",
      "resendVerification",
    ] as const) {
      expect(
        isExpired(
          {
            action,
            at: at("2025-11-10T00:00:00Z"),
            banExpiresAt: Option.none(),
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
          },
          now
        )
      ).toBeTruthy();
    }
  });

  it("keeps bans 3 years, and 12 months past a ban's end when that is later", () => {
    const ban = (start: string, end: Option.Option<string>) => ({
      action: "ban" as const,
      at: at(start),
      banExpiresAt: end.pipe(Option.map(at)),
    });

    expect(
      isExpired(ban("2024-01-01T00:00:00Z", Option.none()), now)
    ).toBeFalsy();
    expect(
      isExpired(ban("2023-11-01T00:00:00Z", Option.none()), now)
    ).toBeTruthy();
    // A ban that ended less than a year ago stays, however old.
    expect(
      isExpired(
        ban("2022-01-01T00:00:00Z", Option.some("2026-01-01T00:00:00Z")),
        now
      )
    ).toBeFalsy();
    expect(
      isExpired(
        ban("2022-01-01T00:00:00Z", Option.some("2025-06-01T00:00:00Z")),
        now
      )
    ).toBeTruthy();
    expect(
      isExpired(
        {
          action: "unban",
          at: at("2024-01-01T00:00:00Z"),
          banExpiresAt: Option.none(),
        },
        now
      )
    ).toBeFalsy();
  });

  it("names the instants the purge compares with", () => {
    expect(auditCutoffs(now)).toStrictEqual({
      bans: at("2023-11-09T03:00:00Z"),
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
        },
        now
      )
    ).toBeFalsy();
  });
});
