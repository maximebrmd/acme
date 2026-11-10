import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";
import { maxSignatureLength } from "peal-contract";
import type { Signature } from "peal-contract";

import {
  defaultSignatures,
  emptySignatureDraft,
  signatureDetailsOf,
  signatureDraftOf,
} from "#signatures/draft.ts";
import { withSignature } from "#signatures/insert.ts";

const signature = (
  id: string,
  scope: Signature["scope"],
  isDefault: boolean
): Signature => ({
  createdAt: DateTime.makeUnsafe("2026-11-01T09:00:00Z"),
  id,
  isDefault,
  name: `Signature ${id}`,
  scope,
  text: "The Peal team",
});

describe(signatureDetailsOf, () => {
  it("saves a workspace's signature, trimmed", () => {
    expect(
      signatureDetailsOf({
        ...emptySignatureDraft,
        isDefault: true,
        name: " Team ",
        text: "\nThe Peal team\n",
      })
    ).toStrictEqual(
      Option.some({
        isDefault: true,
        name: "Team",
        scope: { _tag: "workspace" },
        text: "The Peal team",
      })
    );
  });

  it("saves a platform's and a channel's signature with what they name", () => {
    const draft = { ...emptySignatureDraft, name: "Team", text: "The team" };

    expect(
      signatureDetailsOf({ ...draft, platform: "mastodon", scope: "platform" })
    ).toStrictEqual(
      Option.some({
        isDefault: false,
        name: "Team",
        scope: { _tag: "platform", platform: "mastodon" },
        text: "The team",
      })
    );

    expect(
      signatureDetailsOf({ ...draft, channelId: "c1", scope: "channel" })
    ).toStrictEqual(
      Option.some({
        isDefault: false,
        name: "Team",
        scope: { _tag: "channel", channelId: "c1" },
        text: "The team",
      })
    );
  });

  it.each([
    ["no name", { name: " ", text: "The team" }],
    ["no text", { name: "Team", text: "  " }],
    [
      "a text too long",
      { name: "Team", text: "x".repeat(maxSignatureLength + 1) },
    ],
    [
      "a platform not chosen",
      { name: "Team", scope: "platform", text: "The team" },
    ],
    [
      "a channel not chosen",
      { name: "Team", scope: "channel", text: "The team" },
    ],
  ] as const)("saves nothing with %s", (_, fields) => {
    expect(
      signatureDetailsOf({ ...emptySignatureDraft, ...fields })
    ).toStrictEqual(Option.none());
  });

  it("takes a text as long as the limit", () => {
    expect(
      Option.isSome(
        signatureDetailsOf({
          ...emptySignatureDraft,
          name: "Team",
          text: "x".repeat(maxSignatureLength),
        })
      )
    ).toBeTruthy();
  });
});

describe(signatureDraftOf, () => {
  it("opens a signature in its form, and saves it back unchanged", () => {
    const kept = signature("s1", { _tag: "channel", channelId: "c1" }, true);

    expect(signatureDetailsOf(signatureDraftOf(kept))).toStrictEqual(
      Option.some({
        isDefault: true,
        name: kept.name,
        scope: kept.scope,
        text: kept.text,
      })
    );
  });
});

describe(defaultSignatures, () => {
  it("keeps the defaults only", () => {
    const all = [
      signature("s1", { _tag: "workspace" }, true),
      signature("s2", { _tag: "workspace" }, false),
      signature("s3", { _tag: "platform", platform: "bluesky" }, true),
    ];

    expect(defaultSignatures(all).map(({ id }) => id)).toStrictEqual([
      "s1",
      "s3",
    ]);
  });
});

describe(withSignature, () => {
  const texts = { overrides: { c2: "On this channel" }, text: "Hello" };

  it("signs the text for all channels, a blank line above", () => {
    expect(withSignature(texts, undefined, "The team")).toStrictEqual({
      overrides: { c2: "On this channel" },
      text: "Hello\n\nThe team",
    });
  });

  it("signs a channel's own text, leaving the others", () => {
    expect(withSignature(texts, "c2", "The team")).toStrictEqual({
      overrides: { c2: "On this channel\n\nThe team" },
      text: "Hello",
    });
  });

  it("gives a channel without a text of its own the common text, signed", () => {
    expect(
      withSignature(
        { overrides: { c1: "  " }, text: "Hello" },
        "c1",
        "The team"
      )
    ).toStrictEqual({
      overrides: { c1: "Hello\n\nThe team" },
      text: "Hello",
    });
  });

  it("never signs a text twice", () => {
    const once = withSignature(texts, undefined, "The team");

    expect(withSignature(once, undefined, "The team")).toStrictEqual(once);
  });

  it("makes the signature the whole text of an empty post", () => {
    expect(
      withSignature({ overrides: {}, text: "" }, undefined, "The team").text
    ).toBe("The team");
  });
});
