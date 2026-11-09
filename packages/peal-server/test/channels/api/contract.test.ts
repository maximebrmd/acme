import { describe, expect, it } from "@effect/vitest";
import { Api } from "peal-contract";
import { OpenApi } from "effect/http-api";

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
});
