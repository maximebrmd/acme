import { assert, describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { actorFor } from "#workspace/domain/membership.ts";
import {
  PartnerIdSchema,
  PartnerKeyIdSchema,
} from "#workspace/domain/partner-id.ts";
import { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";
import {
  distinctScopes,
  grantableToPartnerKey,
  partnerKeyPermissions,
} from "#workspace/domain/partner-key.ts";

const now = DateTime.makeUnsafe("2026-11-10T12:00:00Z");

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const partnerId = PartnerIdSchema.make("00000000-0000-7000-8000-00000000000a");

const otherPartnerId = PartnerIdSchema.make(
  "00000000-0000-7000-8000-00000000000b"
);

const key = new PartnerKeyPrincipal({
  partnerId,
  partnerKeyId: PartnerKeyIdSchema.make("00000000-0000-7000-8000-0000000000aa"),
  permissions: ["channel:read", "post:schedule"],
  scopes: ["workspaces:read"],
});

const failureOf = (result: ReturnType<typeof actorFor>) =>
  Result.isFailure(result) ? result.failure._tag : "allowed";

describe(grantableToPartnerKey, () => {
  it("grants what a product does for its customers, once each, in order", () => {
    assert.deepStrictEqual(
      grantableToPartnerKey(["post:read", "channel:read", "post:read"]),
      Result.succeed(["channel:read", "post:read"])
    );
  });

  it("refuses what only people do, naming it", () => {
    for (const permission of [
      "apiKey:create",
      "billing:manage",
      "invitation:create",
      "member:delete",
      "organization:delete",
      "partner:manage",
      "partner:read",
    ] as const) {
      const result = grantableToPartnerKey(["post:read", permission]);

      expect(
        Result.isFailure(result) ? result.failure.permission : "granted"
      ).toBe(permission);
    }
  });

  // Ads spend a customer's money on their own payment method, on a
  // decision an owner makes in person: a product acting for them reads
  // none of it either.
  it("refuses every ads permission, spending first among them", () => {
    for (const permission of [
      "ads:spend",
      "ads:manage",
      "ads:authorize",
      "ads:read",
    ] as const) {
      const result = grantableToPartnerKey(["post:read", permission]);

      expect(
        Result.isFailure(result) ? result.failure.permission : "granted"
      ).toBe(permission);
    }
  });
});

describe(distinctScopes, () => {
  it("keeps each scope once, in vocabulary order", () => {
    expect(
      distinctScopes([
        "workspaces:delete",
        "workspaces:read",
        "workspaces:read",
      ])
    ).toStrictEqual(["workspaces:read", "workspaces:delete"]);
  });
});

describe("a partner key in a workspace", () => {
  it("acts with its permissions where its partner owns the workspace", () => {
    const actor = Result.getOrThrow(
      actorFor(key, workspaceId, Option.none(), now, Option.some(partnerId))
    );

    assert.deepStrictEqual(actor.permissions, [
      "channel:read",
      "post:schedule",
    ]);
    assert.strictEqual(actor.workspaceId, workspaceId);
    assert.deepStrictEqual(actor.subject, {
      _tag: "apiKey",
      apiKeyId: key.partnerKeyId,
    });
  });

  it("finds no workspace another partner owns, or nobody does", () => {
    expect(
      failureOf(
        actorFor(
          key,
          workspaceId,
          Option.none(),
          now,
          Option.some(otherPartnerId)
        )
      )
    ).toBe("NotAMember");
    expect(failureOf(actorFor(key, workspaceId, Option.none(), now))).toBe(
      "NotAMember"
    );
  });
});

describe("a partner key's permissions", () => {
  it("never take the direct messages: a partner's workspace has no owner to let them in", () => {
    expect(partnerKeyPermissions).not.toContain("engagement:readMessages");
    expect(partnerKeyPermissions).not.toContain("engagement:message");
  });
});
