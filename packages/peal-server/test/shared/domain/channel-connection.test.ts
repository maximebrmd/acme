import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  connectionOf,
  hasConnections,
  isConnectionOf,
} from "#shared/domain/channel-connection.ts";

describe("a channel's connection", () => {
  it("is the first way there was, for a channel stored without one", () => {
    expect(connectionOf("instagram", Option.none())).toStrictEqual(
      Option.some("facebookLogin")
    );
    expect(connectionOf("linkedin", Option.none())).toStrictEqual(
      Option.some("linkedinProfile")
    );
    expect(connectionOf("linkedin", Option.some("linkedinPage"))).toStrictEqual(
      Option.some("linkedinPage")
    );
  });

  it("is none on platforms with one way in", () => {
    expect(connectionOf("mastodon", Option.none())).toStrictEqual(
      Option.none()
    );
    expect(hasConnections("mastodon")).toBeFalsy();
    expect(hasConnections("linkedin")).toBeTruthy();
  });

  it("belongs to its own platform only", () => {
    expect(isConnectionOf("linkedin", "linkedinPage")).toBeTruthy();
    expect(isConnectionOf("linkedin", "instagramLogin")).toBeFalsy();
    expect(isConnectionOf("instagram", "linkedinProfile")).toBeFalsy();
    expect(isConnectionOf("x", "linkedinPage")).toBeFalsy();
  });
});
