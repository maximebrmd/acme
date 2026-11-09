import { describe, expect, it } from "@effect/vitest";
import { HttpApi } from "effect/http-api";
import {
  Api,
  cliClientId,
  MediaContentTypeSchema,
  PermissionSchema,
  PlatformSchema,
  ProbeStateSchema,
  RejectionReasonSchema,
  RoleSchema,
  WorkspaceAccess,
} from "peal-contract";

import { PlatformSchema as DomainPlatformSchema } from "#channels/domain/platform.ts";
import { MediaContentTypeSchema as DomainContentTypeSchema } from "#media/domain/media-format.ts";
import {
  ProbeStateSchema as DomainProbeStateSchema,
  RejectionReasonSchema as DomainRejectionReasonSchema,
} from "#media/domain/media-status.ts";
import { PermissionSchema as DomainPermissionSchema } from "#shared/domain/access.ts";
import { commandLineClientId } from "#workspace/domain/oauth-grant.ts";
import { RoleSchema as DomainRoleSchema } from "#workspace/domain/roles.ts";

describe("the contract", () => {
  it("lists the server's permission vocabulary", () => {
    expect(PermissionSchema.literals).toStrictEqual(
      DomainPermissionSchema.literals
    );
  });

  it("lists the server's roles", () => {
    expect(RoleSchema.literals).toStrictEqual(DomainRoleSchema.literals);
  });

  it("names the command line's OAuth client as the server does", () => {
    expect(cliClientId).toBe(commandLineClientId);
  });

  it("lists the server's platforms", () => {
    expect(PlatformSchema.literals).toStrictEqual(
      DomainPlatformSchema.literals
    );
  });

  it("lists the media the server stores, and how their probes and uploads end", () => {
    expect(MediaContentTypeSchema.literals).toStrictEqual(
      DomainContentTypeSchema.literals
    );
    expect(ProbeStateSchema.literals).toStrictEqual(
      DomainProbeStateSchema.literals
    );
    expect(RejectionReasonSchema.literals).toStrictEqual(
      DomainRejectionReasonSchema.literals
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

          (/\/:workspaceId(?:\/|$)/u.test(endpoint.path)
            ? scoped
            : unscoped
          ).push(name);
        }
      },
      onGroup: () => {
        // Only endpoints matter.
      },
    });

    expect(unscoped).toStrictEqual([]);
    expect(scoped).toContain("apiKeys.list");
    expect(scoped).toContain("channels.disconnect");
    expect(scoped).toContain("workspaces.delete");
  });
});
