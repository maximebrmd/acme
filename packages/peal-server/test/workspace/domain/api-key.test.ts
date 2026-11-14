import { assert, describe, it } from "@effect/vitest";
import { Option, Result } from "effect";

import { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { grantableBy } from "#workspace/domain/api-key.ts";

const actor = new Actor({
  permissions: ["apiKey:create", "media:read", "post:read"],
  subject: {
    _tag: "user",
    impersonatedBy: Option.none(),
    userId: UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7"),
  },
  workspaceId: WorkspaceIdSchema.make("5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"),
});

describe(grantableBy, () => {
  it("grants what the creator holds, once each, in vocabulary order", () => {
    assert.deepStrictEqual(
      grantableBy(actor, ["post:read", "media:read", "post:read"]),
      Result.succeed(["media:read", "post:read"])
    );
  });

  it("refuses a permission the creator lacks, naming it", () => {
    const result = grantableBy(actor, ["post:read", "post:publish"]);

    assert.isTrue(Result.isFailure(result));
    assert.strictEqual(
      Result.isFailure(result) ? result.failure.permission : "",
      "post:publish"
    );
  });

  it("refuses what only a person does, even to an owner who holds it", () => {
    const owner = new Actor({
      permissions: ["ads:authorize", "ads:read"],
      subject: actor.subject,
      workspaceId: actor.workspaceId,
    });

    const result = grantableBy(owner, ["ads:read", "ads:authorize"]);

    assert.strictEqual(
      Result.isFailure(result) ? result.failure._tag : "granted",
      "PermissionNotGrantable"
    );
    assert.strictEqual(
      Result.isFailure(result) ? result.failure.permission : "",
      "ads:authorize"
    );
  });

  it("never gives a key the right to require two-step verification", () => {
    const owner = new Actor({
      permissions: ["organization:secure", "post:read"],
      subject: actor.subject,
      workspaceId: actor.workspaceId,
    });

    const result = grantableBy(owner, ["post:read", "organization:secure"]);

    assert.strictEqual(
      Result.isFailure(result) ? result.failure.permission : "",
      "organization:secure"
    );
  });
});

const refusal = (result: ReturnType<typeof grantableBy>) =>
  Result.isFailure(result) ? result.failure._tag : "granted";

describe("the direct messages' permissions on a key", () => {
  const messages = ["engagement:readMessages", "engagement:message"] as const;

  const holding = (
    permissions: readonly Parameters<typeof grantableBy>[1][number][],
    subject: Actor["subject"] = actor.subject
  ) =>
    new Actor({
      permissions: [...permissions, ...messages],
      subject,
      workspaceId: actor.workspaceId,
    });

  it("are given by an owner in person, as the owner's leave", () => {
    assert.deepStrictEqual(
      grantableBy(holding(["organization:secure"]), [...messages]),
      Result.succeed(["engagement:message", "engagement:readMessages"])
    );
  });

  it("are refused to an admin, who holds them but is no owner", () => {
    assert.strictEqual(
      refusal(grantableBy(holding([]), ["engagement:readMessages"])),
      "PermissionNotGrantable"
    );
  });

  it("are refused to an application, even an owner's", () => {
    const throughApp = holding(["organization:secure"], {
      _tag: "user",
      clientId: "synthetic-client",
      impersonatedBy: Option.none(),
      userId: UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7"),
    });

    assert.strictEqual(
      refusal(grantableBy(throughApp, ["engagement:message"])),
      "PermissionNotGrantable"
    );
  });
});
