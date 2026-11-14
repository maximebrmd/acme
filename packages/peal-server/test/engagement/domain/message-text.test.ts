import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  chatOverflow,
  mentionsOutside,
  outgoingMessageText,
} from "#engagement/domain/message-text.ts";
import { participant } from "#test/engagement/support.ts";

describe("a message's text", () => {
  it("mentions every participant first on Mastodon, unless the member did", () => {
    expect(
      outgoingMessageText(
        "mastodon",
        [participant(1), participant(2)],
        "  Hello  "
      )
    ).toBe("@reader1@social.example @reader2@social.example Hello");
    expect(
      outgoingMessageText(
        "mastodon",
        [participant(1), participant(2)],
        "@reader2@social.example Hello"
      )
    ).toBe("@reader1@social.example @reader2@social.example Hello");
  });

  it("goes out as written on Bluesky, within its chat's limits", () => {
    expect(outgoingMessageText("bluesky", [participant(1)], " Hello ")).toBe(
      "Hello"
    );
    expect(chatOverflow("bluesky", "a".repeat(1000))).toStrictEqual(
      Option.none()
    );
    expect(chatOverflow("bluesky", "a".repeat(1001))).toStrictEqual(
      Option.some({ length: 1001, maximum: 1000, unit: "graphemes" })
    );
    // 1,000 graphemes of four bytes each pass the graphemes, not the bytes.
    expect(chatOverflow("bluesky", "👩🏽‍💻".repeat(1000))).toStrictEqual(
      Option.some({ length: 15_000, maximum: 10_000, unit: "utf8Bytes" })
    );
    expect(chatOverflow("mastodon", "a".repeat(5000))).toStrictEqual(
      Option.none()
    );
  });
});

describe("a Mastodon message's mentions", () => {
  it("name the accounts outside the conversation the text would reach", () => {
    expect(
      mentionsOutside(
        "mastodon",
        [participant(1)],
        "Thanks! cc @boss@other.example and @journalist, @Reader1@Social.Example"
      )
    ).toStrictEqual(["@boss@other.example", "@journalist"]);
    expect(
      mentionsOutside(
        "mastodon",
        [participant(1)],
        "Write to hello@shop.example"
      )
    ).toStrictEqual([]);
    // Bluesky's chat delivers to the conversation only.
    expect(
      mentionsOutside("bluesky", [participant(1)], "cc @boss.bsky.social")
    ).toStrictEqual([]);
  });
});
