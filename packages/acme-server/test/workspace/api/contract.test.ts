import { describe, expect, it } from "@effect/vitest";
import {
  Api,
  PermissionSchema,
  PlatformSchema,
  WorkspaceAccess,
} from "acme-contract";
import { HttpApi } from "effect/http-api";

import { PlatformSchema as DomainPlatformSchema } from "#channels/domain/platform.ts";
import { PermissionSchema as DomainPermissionSchema } from "#shared/domain/access.ts";

describe("the contract", () => {
  it("lists the server's permission vocabulary", () => {
    expect(PermissionSchema.literals).toStrictEqual(
      DomainPermissionSchema.literals
    );
  });

  it("lists the server's platforms", () => {
    expect(PlatformSchema.literals).toStrictEqual(
      DomainPlatformSchema.literals
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
    expect(scoped).toContain("channels.disconnect");
  });
});
