import { assert, describe, it } from "@effect/vitest";
import { DateTime, Option, Result } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { ApiKeyPrincipal } from "#workspace/domain/api-key-principal.ts";
import {
  actorFor,
  withheldWhileImpersonating,
} from "#workspace/domain/membership.ts";
import type { Membership } from "#workspace/domain/membership.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const now = DateTime.makeUnsafe("2026-11-09T12:00:00Z");

const workspaceId = WorkspaceIdSchema.make(
  "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60"
);

const otherWorkspaceId = WorkspaceIdSchema.make(
  "0d3f6b1a-2c4e-4f5a-8b6c-7d8e9f0a1b2c"
);

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const staffId = UserIdSchema.make("1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b");

const user = new UserPrincipal({ impersonatedBy: Option.none(), userId });

const editor: Membership = { ban: Option.none(), role: "editor" };

const failureOf = (result: ReturnType<typeof actorFor>) =>
  Result.isFailure(result) ? result.failure._tag : "allowed";

describe(actorFor, () => {
  it("gives a member what their role allows", () => {
    const actor = Result.getOrThrow(
      actorFor(user, workspaceId, Option.some(editor), now)
    );

    assert.deepStrictEqual(actor.permissions, permissionsFor("editor"));
    assert.strictEqual(actor.workspaceId, workspaceId);
  });

  it("refuses someone who is not a member", () => {
    const result = actorFor(user, workspaceId, Option.none(), now);

    assert.strictEqual(failureOf(result), "NotAMember");
  });

  it("refuses a banned member", () => {
    const banned: Membership = {
      ban: Option.some({ expiresAt: Option.none() }),
      role: "owner",
    };

    const result = actorFor(user, workspaceId, Option.some(banned), now);

    assert.strictEqual(failureOf(result), "BannedUser");
  });

  it("withholds accounts, billing and API keys from staff impersonating a member, not publishing", () => {
    const impersonated = new UserPrincipal({
      impersonatedBy: Option.some(staffId),
      userId,
    });

    const actor = Result.getOrThrow(
      actorFor(
        impersonated,
        workspaceId,
        Option.some({ ban: Option.none(), role: "owner" }),
        now
      )
    );

    for (const withheld of withheldWhileImpersonating) {
      assert.notInclude(actor.permissions, withheld);
    }

    assert.include(actor.permissions, "post:schedule");
    assert.include(actor.permissions, "post:publish");
  });

  it("lets an API key act in its own workspace with its own permissions", () => {
    const key = new ApiKeyPrincipal({
      apiKeyId: "key-1",
      permissions: ["post:read"],
      workspaceId,
    });

    const actor = Result.getOrThrow(
      actorFor(key, workspaceId, Option.none(), now)
    );

    assert.deepStrictEqual(actor.permissions, ["post:read"]);
    assert.deepStrictEqual(actor.subject, {
      _tag: "apiKey",
      apiKeyId: "key-1",
    });
  });

  it("refuses an API key in another workspace", () => {
    const key = new ApiKeyPrincipal({
      apiKeyId: "key-1",
      permissions: ["post:read"],
      workspaceId: otherWorkspaceId,
    });

    const result = actorFor(key, workspaceId, Option.none(), now);

    assert.strictEqual(failureOf(result), "WorkspaceMismatch");
  });
});
