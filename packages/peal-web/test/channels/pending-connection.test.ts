import { afterEach, describe, expect, it } from "@effect/vitest";

import {
  forgetConnection,
  pendingWorkspace,
  rememberConnection,
} from "#channels/pending-connection.ts";

const workspaceId = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

describe("the connection a tab started", () => {
  afterEach(() => {
    globalThis.sessionStorage.clear();
  });

  it("is remembered for its platform until forgotten", () => {
    rememberConnection({ platform: "mastodon", workspaceId });

    expect(pendingWorkspace("mastodon")).toBe(workspaceId);
    expect(pendingWorkspace("bluesky")).toBeNull();

    forgetConnection();

    expect(pendingWorkspace("mastodon")).toBeNull();
  });

  it("reads as none when the tab stored something else", () => {
    globalThis.sessionStorage.setItem(
      "peal.channels.pending-connection",
      "{not json"
    );

    expect(pendingWorkspace("mastodon")).toBeNull();
  });
});
