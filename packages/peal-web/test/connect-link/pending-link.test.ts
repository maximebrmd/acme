import { afterEach, describe, expect, it } from "@effect/vitest";

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
    ["/connect/link/synthetic-token", false, "hosted"],
    ["/connect/mastodon/callback", true, "hosted"],
    ["/connect/mastodon/callback", false, "app"],
    ["/connect/link/synthetic-token/more", false, "app"],
    ["/app", true, "app"],
    ["/", false, "app"],
  ] as const)(
    "frames %s, for a tab that came through a link: %s, as %s",
    (pathname, through, frame) => {
      expect(frameOf(pathname, through)).toBe(frame);
    }
  );
});
