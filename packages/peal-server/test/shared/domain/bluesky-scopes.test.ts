import { describe, expect, it } from "@effect/vitest";

import { blueskyScope } from "#channels/infrastructure/platforms/bluesky/bluesky-client.ts";
import {
  blueskyGateScopes,
  createsRecords,
  postgateCollection,
  threadgateCollection,
} from "#shared/domain/bluesky-scopes.ts";

const gates = [threadgateCollection, postgateCollection];

describe("a Bluesky account's scopes", () => {
  it("let Peal write a post's gates once granted, as Peal now asks", () => {
    expect(createsRecords(blueskyScope.split(" "), gates)).toBeTruthy();
    expect(createsRecords([...blueskyGateScopes], gates)).toBeTruthy();
  });

  it("do not, on a channel connected before Peal asked for them", () => {
    const before = [
      "atproto",
      "repo:app.bsky.feed.post?action=create&action=delete",
      "blob:image/*",
    ];

    expect(createsRecords(before, gates)).toBeFalsy();
    expect(createsRecords(before, ["app.bsky.feed.post"])).toBeTruthy();
  });

  it("read the permission spec's forms of a repo scope", () => {
    expect(createsRecords(["repo:*"], gates)).toBeTruthy();
    expect(
      createsRecords(
        [
          "repo?collection=app.bsky.feed.threadgate&collection=app.bsky.feed.postgate",
        ],
        gates
      )
    ).toBeTruthy();
    expect(
      createsRecords(["repo:app.bsky.feed.threadgate"], gates)
    ).toBeFalsy();
    expect(
      createsRecords(
        [
          "repo:app.bsky.feed.threadgate?action=delete",
          "repo:app.bsky.feed.postgate?action=create",
        ],
        gates
      )
    ).toBeFalsy();
  });

  it("allow every write in a session from before granular scopes, and none in atproto alone", () => {
    expect(createsRecords(["transition:generic"], gates)).toBeTruthy();
    expect(createsRecords(["atproto"], gates)).toBeFalsy();
  });

  it("grant nothing by a scope that does not decode, and never throw on it", () => {
    expect(createsRecords(["repo:%zz"], gates)).toBeFalsy();
    expect(
      createsRecords(["repo:%zz?action=create", "repo:*"], gates)
    ).toBeTruthy();
  });
});
