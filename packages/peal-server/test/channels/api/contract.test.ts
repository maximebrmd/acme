import { describe, expect, it } from "@effect/vitest";
import { OpenApi } from "effect/http-api";
import {
  Api,
  ChannelConnectionSchema as ContractChannelConnectionSchema,
  ChannelPlatformSchema as ContractChannelPlatformSchema,
  InstagramConnectionSchema as ContractConnectionSchema,
  LinkedInConnectionSchema as ContractLinkedInConnectionSchema,
  MetaAppSchema,
  PlatformSchema as ContractPlatformSchema,
  SitePlatformSchema as ContractSitePlatformSchema,
} from "peal-contract";

import { MetaAppKindSchema } from "#channels/domain/data-deletion.ts";
import {
  ChannelPlatformSchema,
  PlatformSchema,
  SitePlatformSchema,
} from "#channels/domain/platform.ts";
import { ChannelConnectionSchema } from "#shared/domain/channel-connection.ts";
import { InstagramConnectionSchema } from "#shared/domain/instagram-connection.ts";
import { LinkedInConnectionSchema } from "#shared/domain/linkedin-connection.ts";

// What the API reference tells clients each endpoint may answer.
const documentedStatuses = (path: string) =>
  Object.keys(OpenApi.fromApi(Api).paths[path]?.post?.responses ?? {});

describe("the channels contract", () => {
  it("lists no plan limit on reconnecting, which adds no channel", () => {
    expect(
      documentedStatuses(
        "/api/workspaces/{workspaceId}/channels/{channelId}/reconnect"
      )
    ).not.toContain("402");
    expect(
      documentedStatuses(
        "/api/workspaces/{workspaceId}/channels/connect/{platform}"
      )
    ).toContain("402");
  });

  it("copies the server's websites, and what a channel connects to", () => {
    expect(ContractSitePlatformSchema.literals).toStrictEqual(
      SitePlatformSchema.literals
    );
    expect(ContractChannelPlatformSchema.literals).toStrictEqual(
      ChannelPlatformSchema.literals
    );
  });

  it("copies the server's platforms, Instagram's and LinkedIn's ways in and Meta's apps", () => {
    expect(ContractPlatformSchema.literals).toStrictEqual(
      PlatformSchema.literals
    );
    expect(ContractConnectionSchema.literals).toStrictEqual(
      InstagramConnectionSchema.literals
    );
    expect(ContractLinkedInConnectionSchema.literals).toStrictEqual(
      LinkedInConnectionSchema.literals
    );
    expect(ContractChannelConnectionSchema.literals).toStrictEqual(
      ChannelConnectionSchema.literals
    );
    expect(MetaAppSchema.literals).toStrictEqual(MetaAppKindSchema.literals);
  });
});
