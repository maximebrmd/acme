import { assert, it } from "@effect/vitest";
import { Effect } from "effect";
import { Forbidden } from "peal-contract";
import type { Member, Permission } from "peal-contract";

import { explained } from "#workspace/api/refusal.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const workspaceId = "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60";

// An owner, through an OAuth client that holds every scope it asked for.
const ownerThrough = (clientId: string): Member => ({
  permissions: permissionsFor("owner"),
  principal: {
    _tag: "user",
    impersonatedBy: null,
    oauth: {
      clientId,
      scopes: ["workspace:read", "workspace:write", "workspace:publish"],
      workspaceId: null,
    },
    userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  },
  workspaceId,
});

const refusedFor = (member: Member, permission: Permission) =>
  explained(
    member,
    new Forbidden({ permission, reason: "missingPermission" })
  ).pipe(Effect.map(({ message }) => message ?? ""));

it.effect(
  "tells an owner's application that no application does what only the person or the command line does",
  () =>
    Effect.gen(function* applications() {
      const configure = yield* refusedFor(
        ownerThrough("synthetic-mcp-client"),
        "assistant:configure"
      );

      assert.include(configure, "No application connected over OAuth");
      assert.include(configure, "Peal's command line");
      assert.notInclude(configure, "Your role");

      const secure = yield* refusedFor(
        ownerThrough("synthetic-mcp-client"),
        "organization:secure"
      );

      assert.include(secure, "No application connected over OAuth");
      assert.notInclude(secure, "command line");
      assert.notInclude(secure, "Your role");
    })
);

it.effect("still tells a member in their own session about their role", () =>
  Effect.gen(function* role() {
    const message = yield* refusedFor(
      {
        permissions: permissionsFor("editor"),
        principal: {
          _tag: "user",
          impersonatedBy: null,
          userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        },
        workspaceId,
      },
      "assistant:configure"
    );

    assert.include(message, "Your role");
  })
);
