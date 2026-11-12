import { describe, expect, it } from "@effect/vitest";
import { Duration } from "effect";
import { HttpApi } from "effect/http-api";
import {
  Api,
  cliClientId,
  creationKeyLifetimeHours,
  defaultWorkspacePageSize,
  maxCreationKeyLength,
  maxExternalIdLength,
  maxPartnerKeyNameLength,
  maxPartnerLogoUrlLength,
  maxPartnerNameLength,
  maxReturnOrigins,
  maxWorkspaceNameLength,
  maxWorkspacePageSize,
  MediaContentTypeSchema,
  partnerKeyPermissions,
  PartnerScopeSchema,
  PermissionSchema,
  PlatformSchema,
  ProbeStateSchema,
  RejectionReasonSchema,
  RoleSchema,
  usageRetentionDays,
  WorkspaceAccess,
} from "peal-contract";

import { PlatformSchema as DomainPlatformSchema } from "#channels/domain/platform.ts";
import { MediaContentTypeSchema as DomainContentTypeSchema } from "#media/domain/media-format.ts";
import {
  ProbeStateSchema as DomainProbeStateSchema,
  RejectionReasonSchema as DomainRejectionReasonSchema,
} from "#media/domain/media-status.ts";
import { PermissionSchema as DomainPermissionSchema } from "#shared/domain/access.ts";
import {
  defaultWorkspacePageSize as serverDefaultPageSize,
  maxWorkspacePageSize as serverMaxPageSize,
} from "#workspace/application/partner-workspaces.ts";
import {
  maxExternalIdLength as domainMaxExternalIdLength,
  maxWorkspaceNameLength as domainMaxWorkspaceNameLength,
} from "#workspace/domain/customer-workspace.ts";
import {
  creationKeyLifetime,
  maxCreationKeyLength as domainMaxCreationKeyLength,
} from "#workspace/domain/idempotency.ts";
import { commandLineClientId } from "#workspace/domain/oauth-grant.ts";
import {
  maxPartnerKeyNameLength as domainMaxKeyNameLength,
  partnerKeyPermissions as domainKeyPermissions,
  PartnerScopeSchema as DomainPartnerScopeSchema,
} from "#workspace/domain/partner-key.ts";
import { partnerUsageRetentionDays } from "#workspace/domain/partner-usage-retention.ts";
import {
  maxPartnerLogoUrlLength as domainMaxLogoUrlLength,
  maxPartnerNameLength as domainMaxPartnerNameLength,
} from "#workspace/domain/partner.ts";
import { maxReturnOrigins as domainMaxReturnOrigins } from "#workspace/domain/return-origin.ts";
import { RoleSchema as DomainRoleSchema } from "#workspace/domain/roles.ts";

describe("the contract", () => {
  it("lists the server's permission vocabulary", () => {
    expect(PermissionSchema.literals).toStrictEqual(
      DomainPermissionSchema.literals
    );
  });

  it("lists what the server gives partner keys, and its partners' limits", () => {
    expect(PartnerScopeSchema.literals).toStrictEqual(
      DomainPartnerScopeSchema.literals
    );
    expect(partnerKeyPermissions).toStrictEqual(domainKeyPermissions);
    expect({
      creationKeyLifetimeHours,
      defaultWorkspacePageSize,
      maxCreationKeyLength,
      maxExternalIdLength,
      maxPartnerKeyNameLength,
      maxPartnerLogoUrlLength,
      maxPartnerNameLength,
      maxReturnOrigins,
      maxWorkspaceNameLength,
      maxWorkspacePageSize,
    }).toStrictEqual({
      creationKeyLifetimeHours: Duration.toHours(creationKeyLifetime),
      defaultWorkspacePageSize: serverDefaultPageSize,
      maxCreationKeyLength: domainMaxCreationKeyLength,
      maxExternalIdLength: domainMaxExternalIdLength,
      maxPartnerKeyNameLength: domainMaxKeyNameLength,
      maxPartnerLogoUrlLength: domainMaxLogoUrlLength,
      maxPartnerNameLength: domainMaxPartnerNameLength,
      maxReturnOrigins: domainMaxReturnOrigins,
      maxWorkspaceNameLength: domainMaxWorkspaceNameLength,
      maxWorkspacePageSize: serverMaxPageSize,
    });
  });

  it("keeps a partner's daily counts as long as it says usage is kept", () => {
    expect(partnerUsageRetentionDays).toBe(usageRetentionDays);
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
