import { afterEach, describe, expect, it } from "@effect/vitest";

import { rememberConnection } from "#channels/pending-connection.ts";
import { cameThroughLink, frameOf } from "#connect-link/frame.ts";
import {
  forgetLink,
  pendingLink,
  rememberLink,
} from "#connect-link/pending-link.ts";

const token = "synthetic-token-0123456789abcdefghijklmnopqrstuv";

describe("the connect link a tab came from", () => {
  afterEach(() => {
    globalThis.sessionStorage.clear();
  });

  it("is remembered for its platform until forgotten", () => {
    rememberLink({ platform: "mastodon", token });

    expect(pendingLink("mastodon")).toBe(token);
    expect(pendingLink("bluesky")).toBeNull();

    forgetLink();

    expect(pendingLink("mastodon")).toBeNull();
  });

  it("is forgotten once the tab starts a member's own connection, a reconnection included", () => {
    rememberLink({ platform: "mastodon", token });
    rememberConnection({
      platform: "mastodon",
      workspaceId: "5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60",
    });

    expect(pendingLink("mastodon")).toBeNull();
    expect(cameThroughLink("/connect/mastodon/callback")).toBeFalsy();
  });

  it("reads as none when the tab stored something else", () => {
    globalThis.sessionStorage.setItem("peal.connect-link.pending", "{not json");

    expect(pendingLink("mastodon")).toBeNull();
  });

  it("tells the callback page of its platform that it is a link's", () => {
    rememberLink({ platform: "mastodon", token });

    expect(cameThroughLink("/connect/mastodon/callback")).toBeTruthy();
    expect(cameThroughLink("/connect/bluesky/callback")).toBeFalsy();
    expect(cameThroughLink("/app")).toBeFalsy();
  });
});

describe(frameOf, () => {
  it.each([
    ["/connect/link", false, "hosted"],
    ["/connect/mastodon/callback", true, "hosted"],
    ["/connect/mastodon/callback", false, "app"],
    ["/connect/link/more", false, "app"],
    ["/app", true, "own"],
    ["/", false, "app"],
  ] as const)(
    "frames %s, for a tab that came through a link: %s, as %s",
    (pathname, through, frame) => {
      expect(frameOf(pathname, through)).toBe(frame);
    }
  );
});
