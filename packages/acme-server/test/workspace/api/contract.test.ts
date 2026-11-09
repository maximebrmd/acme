import { describe, expect, it } from "@effect/vitest";
import { Api, PermissionSchema, WorkspaceAccess } from "acme-contract";
import { HttpApi } from "effect/http-api";

import { PermissionSchema as DomainPermissionSchema } from "#shared/domain/access.ts";

describe("the contract", () => {
  it("lists the server's permission vocabulary", () => {
    expect(PermissionSchema.literals).toStrictEqual(
      DomainPermissionSchema.literals
    );
  });

  // WorkspaceAccess reads the workspace from the path.
  it("puts every endpoint behind WorkspaceAccess under a :workspaceId", () => {
    const scoped: string[] = [];
    const unscoped: string[] = [];

    HttpApi.reflect(Api, {
      onEndpoint: ({ endpoint, group, middleware }) => {
        const keys = Array.from(middleware, (service) => service.key);

        if (keys.includes(WorkspaceAccess.key)) {
          const name = `${group.identifier}.${endpoint.identifier}`;

          (endpoint.path.includes("/:workspaceId/") ? scoped : unscoped).push(
            name
          );
        }
      },
      onGroup: () => {
        // Only endpoints matter.
      },
    });

    expect(unscoped).toStrictEqual([]);
    expect(scoped).toContain("apiKeys.list");
  });
});
