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
});
