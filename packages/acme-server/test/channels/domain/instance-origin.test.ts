import { describe, expect, it } from "@effect/vitest";
import { Result } from "effect";

import { parseInstance } from "#channels/domain/instance-origin.ts";

describe(parseInstance, () => {
  it.each([
    ["mastodon.social", "https://mastodon.social"],
    ["  Mastodon.Social  ", "https://mastodon.social"],
    ["https://mastodon.social/", "https://mastodon.social"],
    ["https://mastodon.social/@alice", "https://mastodon.social"],
    ["@alice@mastodon.social", "https://mastodon.social"],
    ["alice@mastodon.social", "https://mastodon.social"],
    ["http://localhost:3000", "http://localhost:3000"],
  ])("reads %j as %s", (input, origin) => {
    expect(Result.getOrThrow(parseInstance(input))).toBe(origin);
  });

  it.each([
    "",
    "not a server",
    "ftp://mastodon.social",
    "https://alice:secret@mastodon.social",
  ])("refuses %j", (input) => {
    expect(Result.isFailure(parseInstance(input))).toBeTruthy();
  });
});
