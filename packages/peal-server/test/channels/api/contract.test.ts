import { describe, expect, it } from "@effect/vitest";
import { OpenApi } from "effect/http-api";
import {
  Api,
  InstagramConnectionSchema as ContractConnectionSchema,
  MetaAppSchema,
  PlatformSchema as ContractPlatformSchema,
} from "peal-contract";

import { MetaAppKindSchema } from "#channels/domain/data-deletion.ts";
import { PlatformSchema } from "#channels/domain/platform.ts";
import { InstagramConnectionSchema } from "#shared/domain/instagram-connection.ts";

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

  it("copies the server's platforms, Instagram's ways in and Meta's apps", () => {
    expect(ContractPlatformSchema.literals).toStrictEqual(
      PlatformSchema.literals
    );
    expect(ContractConnectionSchema.literals).toStrictEqual(
      InstagramConnectionSchema.literals
    );
    expect(MetaAppSchema.literals).toStrictEqual(MetaAppKindSchema.literals);
  });
});
