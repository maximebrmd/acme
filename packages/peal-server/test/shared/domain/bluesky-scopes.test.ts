import { describe, expect, it } from "@effect/vitest";

import { blueskyScope } from "#channels/infrastructure/platforms/bluesky/bluesky-client.ts";
import {
  allowsRpc,
  blueskyChatMethods,
  blueskyChatScopes,
  blueskyGateScopes,
  blueskyRepostScope,
  createsRecords,
  grantsBlueskyChat,
  postgateCollection,
  repostCollection,
  threadgateCollection,
} from "#shared/domain/bluesky-scopes.ts";

const gates = [threadgateCollection, postgateCollection];

describe("a Bluesky account's scopes", () => {
  it("let Peal write a post's gates once granted, as Peal now asks", () => {
    expect(createsRecords(blueskyScope.split(" "), gates)).toBeTruthy();
    expect(createsRecords([...blueskyGateScopes], gates)).toBeTruthy();
  });

  it("let Peal repost the account's own posts once granted, as Peal now asks", () => {
    expect(
      createsRecords(blueskyScope.split(" "), [repostCollection])
    ).toBeTruthy();
    expect(
      createsRecords([blueskyRepostScope], [repostCollection])
    ).toBeTruthy();
    expect(
      createsRecords([...blueskyGateScopes], [repostCollection])
    ).toBeFalsy();
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

describe("a Bluesky account's chat scopes", () => {
  const chat = "did:web:api.bsky.chat#bsky_chat";

  it("are written as the permission spec writes them", () => {
    expect(blueskyChatScopes[0]).toBe(
      "rpc:chat.bsky.convo.listConvos?aud=did:web:api.bsky.chat%23bsky_chat"
    );
  });

  it("let Peal call the chat methods Peal asks for, at the chat service", () => {
    expect(
      blueskyChatMethods.every((method) =>
        allowsRpc([...blueskyChatScopes], method, chat)
      )
    ).toBeTruthy();
    expect(
      allowsRpc([...blueskyChatScopes], "chat.bsky.convo.leaveConvo", chat)
    ).toBeFalsy();
    expect(
      allowsRpc(
        [...blueskyChatScopes],
        "chat.bsky.convo.sendMessage",
        "did:web:api.bsky.app#bsky_appview"
      )
    ).toBeFalsy();
  });

  it("read the permission spec's forms of an rpc scope", () => {
    expect(
      allowsRpc(
        [
          "rpc?lxm=chat.bsky.convo.getMessages&lxm=chat.bsky.convo.sendMessage&aud=did:web:api.bsky.chat%23bsky_chat",
        ],
        "chat.bsky.convo.sendMessage",
        chat
      )
    ).toBeTruthy();
    expect(
      allowsRpc(
        ["rpc:chat.bsky.convo.sendMessage?aud=*"],
        "chat.bsky.convo.sendMessage",
        chat
      )
    ).toBeTruthy();
    expect(
      allowsRpc(
        ["rpc:*?aud=did:web:api.bsky.chat%23bsky_chat"],
        "chat.bsky.convo.listConvos",
        chat
      )
    ).toBeTruthy();
  });

  it("grant nothing in the form the spec forbids, nor malformed", () => {
    expect(
      allowsRpc(["rpc:*?aud=*"], "chat.bsky.convo.listConvos", chat)
    ).toBeFalsy();
    expect(
      allowsRpc(
        ["rpc:chat.bsky.convo.listConvos"],
        "chat.bsky.convo.listConvos",
        chat
      )
    ).toBeFalsy();
    expect(
      allowsRpc(
        ["rpc:chat.bsky.convo.listConvos?aud=%E0%A4%A"],
        "chat.bsky.convo.listConvos",
        chat
      )
    ).toBeFalsy();
  });

  it("let a session of the transitional scopes call every chat method", () => {
    expect(
      allowsRpc(
        ["atproto", "transition:generic", "transition:chat.bsky"],
        "chat.bsky.convo.sendMessage",
        chat
      )
    ).toBeTruthy();
    expect(
      allowsRpc(
        ["atproto", "transition:generic"],
        "chat.bsky.convo.sendMessage",
        chat
      )
    ).toBeFalsy();
  });
});

describe(grantsBlueskyChat, () => {
  it("holds for scopes that allow every chat method Peal calls, granular or transitional", () => {
    expect(grantsBlueskyChat([...blueskyChatScopes])).toBeTruthy();
    expect(
      grantsBlueskyChat([
        "atproto",
        "transition:generic",
        "transition:chat.bsky",
      ])
    ).toBeTruthy();
  });

  it("does not for publishing's scopes, or for some of the chat methods only", () => {
    expect(grantsBlueskyChat(blueskyScope.split(" "))).toBeFalsy();
    expect(grantsBlueskyChat(blueskyChatScopes.slice(0, 2))).toBeFalsy();
  });
});
