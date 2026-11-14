import { describe, expect, it } from "@effect/vitest";

import { messageAbilitiesOf } from "#engagement/domain/message-abilities.ts";
import {
  blueskyChatScopes,
  blueskyChatService,
} from "#shared/domain/bluesky-scopes.ts";

const both = new Set(["mastodon", "bluesky"] as const);

describe("what a channel can do with its messages", () => {
  it("is nothing where the server reads no messages, or on another platform", () => {
    for (const platform of ["mastodon", "bluesky", "facebook"] as const) {
      expect(
        messageAbilitiesOf(
          platform,
          ["read", "write", ...blueskyChatScopes],
          new Set()
        )
      ).toStrictEqual({ read: "unsupported", send: "unsupported" });
    }

    expect(messageAbilitiesOf("facebook", ["read"], both)).toStrictEqual({
      read: "unsupported",
      send: "unsupported",
    });
  });

  it("is reading and answering on Mastodon, with the statuses' scopes", () => {
    expect(
      messageAbilitiesOf(
        "mastodon",
        ["profile", "read:statuses", "write:statuses", "write:media"],
        both
      )
    ).toStrictEqual({ read: "available", send: "available" });
    expect(
      messageAbilitiesOf("mastodon", ["read", "write"], both)
    ).toStrictEqual({
      read: "available",
      send: "available",
    });
    expect(messageAbilitiesOf("mastodon", ["profile"], both)).toStrictEqual({
      read: "reconnect",
      send: "reconnect",
    });
  });

  it("is reading and answering on Bluesky once the chat scopes are granted", () => {
    expect(
      messageAbilitiesOf("bluesky", ["atproto", ...blueskyChatScopes], both)
    ).toStrictEqual({ read: "available", send: "available" });
    expect(
      messageAbilitiesOf(
        "bluesky",
        ["atproto", "repo:app.bsky.feed.post?action=create&action=delete"],
        both
      )
    ).toStrictEqual({ read: "reconnect", send: "reconnect" });
    expect(
      messageAbilitiesOf(
        "bluesky",
        [
          `rpc?lxm=chat.bsky.convo.listConvos&lxm=chat.bsky.convo.getMessages&aud=${encodeURIComponent(blueskyChatService)}`,
        ],
        both
      )
    ).toStrictEqual({ read: "available", send: "reconnect" });
  });
});
