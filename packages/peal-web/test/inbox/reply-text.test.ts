import { describe, expect, it } from "@effect/vitest";
import { maxInboxReplyLength } from "peal-contract";

import {
  mentionFor,
  outgoingText,
  replyFit,
  replyFits,
} from "#inbox/reply-text.ts";

const handle = "ada@social.example";

describe(outgoingText, () => {
  it("puts the mention of the person answered first on Mastodon", () => {
    expect(outgoingText("mastodon", handle, "  Thank you!  ")).toBe(
      "@ada@social.example Thank you!"
    );
  });

  it("adds no mention the text already holds, in any case", () => {
    expect(
      outgoingText("mastodon", handle, "Thank you @Ada@Social.Example!")
    ).toBe("Thank you @Ada@Social.Example!");
    expect(mentionFor("mastodon", handle, "hi @ADA@SOCIAL.EXAMPLE")).toBeNull();
  });

  it("takes only a whole mention for one: another handle that starts alike is someone else", () => {
    expect(outgoingText("mastodon", "bob", "cc @bobby")).toBe("@bob cc @bobby");
    expect(outgoingText("mastodon", "bob", "cc @bob@other.example")).toBe(
      "@bob cc @bob@other.example"
    );
    expect(outgoingText("mastodon", "bob", "cc @bob.smith")).toBe(
      "@bob cc @bob.smith"
    );
    expect(outgoingText("mastodon", "bob", "write to x@bob")).toBe(
      "@bob write to x@bob"
    );
  });

  it("finds a whole mention after one that only starts alike, and before punctuation", () => {
    expect(outgoingText("mastodon", "bob", "@bobby and @bob, thanks.")).toBe(
      "@bobby and @bob, thanks."
    );
    expect(outgoingText("mastodon", "bob", "Thanks @bob.")).toBe(
      "Thanks @bob."
    );
    expect(outgoingText("mastodon", "bob", "(@Bob)")).toBe("(@Bob)");
  });

  it("sends the text as written elsewhere, and without an author", () => {
    expect(outgoingText("bluesky", "ada.example", " Thank you! ")).toBe(
      "Thank you!"
    );
    expect(outgoingText("mastodon", null, "Thank you!")).toBe("Thank you!");
    expect(outgoingText("mastodon", "", "Thank you!")).toBe("Thank you!");
  });
});

describe(replyFit, () => {
  it("counts the mention Peal adds against Mastodon's 500 characters", () => {
    const fit = replyFit("mastodon", handle, "Thank you!");

    // "@ada@social.example " is 20 characters, the text 10.
    expect(fit).toMatchObject({
      empty: false,
      length: 30,
      maximum: 500,
      mention: "@ada@social.example",
      outgoing: "@ada@social.example Thank you!",
      remaining: 470,
      unit: "codePoints",
    });
    expect(replyFits(fit)).toBeTruthy();
  });

  it("refuses a text that fits alone and not with its mention", () => {
    const text = "a".repeat(490);
    const fit = replyFit("mastodon", handle, text);

    expect(fit).toHaveLength(510);
    expect(fit.remaining).toBe(-10);
    expect(replyFits(fit)).toBeFalsy();
    expect(replyFits(replyFit("mastodon", null, text))).toBeTruthy();
  });

  it("counts only the text once it mentions the person itself", () => {
    const fit = replyFit("mastodon", handle, "@ada@social.example thanks");

    expect(fit.mention).toBeNull();
    expect(fit).toHaveLength(26);
  });

  it("counts Bluesky's graphemes, without a mention", () => {
    const fit = replyFit("bluesky", "ada.example", "Merci 👍🏽");

    expect(fit).toMatchObject({
      length: 7,
      maximum: 300,
      mention: null,
      unit: "graphemes",
    });
  });

  it("has nothing to send while the text is blank", () => {
    const fit = replyFit("mastodon", handle, "  \n ");

    expect(fit.empty).toBeTruthy();
    expect(replyFits(fit)).toBeFalsy();
  });

  it("holds a reply to the longest the API takes, as written", () => {
    // A platform whose own limit is above the API's: the API's is closer.
    const fit = replyFit("facebook", null, "a".repeat(maxInboxReplyLength + 1));

    expect(fit).toMatchObject({
      maximum: maxInboxReplyLength,
      remaining: -1,
      unit: "utf16Units",
    });
  });
});
