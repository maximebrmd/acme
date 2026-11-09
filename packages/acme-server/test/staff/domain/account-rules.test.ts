import { assert, describe, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { UserIdSchema } from "#shared/domain/ids.ts";
import { mayAct } from "#staff/domain/account-rules.ts";
import type { Request, Target } from "#staff/domain/account-rules.ts";

const staffId = UserIdSchema.make("0b6f2f3e-6c1e-4f0e-8a3b-1d2c3e4f5a60");

const member: Target = {
  banned: false,
  emailVerified: true,
  id: UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7"),
  staff: false,
};

const self: Target = { ...member, id: staffId, staff: true };

const now = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

const refusal = (target: Target, request: Request) =>
  Result.match(mayAct(staffId, target, request, now), {
    onFailure: ({ reason }) => reason,
    onSuccess: () => "allowed",
  });

const ban = (expiresAt: Option.Option<DateTime.Utc>): Request => ({
  action: "ban",
  expiresAt,
});

describe(mayAct, () => {
  it("lets staff act on a member", () => {
    for (const action of ["impersonate", "revokeSessions", "unban"] as const) {
      assert.strictEqual(refusal(member, { action }), "allowed", action);
    }

    assert.strictEqual(refusal(member, ban(Option.none())), "allowed");
  });

  it("never bans, signs out or impersonates staff themselves", () => {
    for (const request of [
      ban(Option.none()),
      { action: "impersonate" },
      { action: "revokeSessions" },
    ] as const) {
      assert.strictEqual(refusal(self, request), "self", request.action);
    }
  });

  it("never impersonates other staff", () => {
    assert.strictEqual(
      refusal({ ...member, staff: true }, { action: "impersonate" }),
      "staff"
    );
  });

  it("never acts as a banned account", () => {
    assert.strictEqual(
      refusal({ ...member, banned: true }, { action: "impersonate" }),
      "banned"
    );
  });

  it("only resends a confirmation an address still needs", () => {
    assert.strictEqual(
      refusal(member, { action: "resendVerification" }),
      "verified"
    );
    assert.strictEqual(
      refusal(
        { ...member, emailVerified: false },
        {
          action: "resendVerification",
        }
      ),
      "allowed"
    );
  });

  it("refuses a ban that ends now or before", () => {
    assert.strictEqual(refusal(member, ban(Option.some(now))), "expired");
    assert.strictEqual(
      refusal(member, ban(Option.some(DateTime.add(now, { seconds: 1 })))),
      "allowed"
    );
  });
});
