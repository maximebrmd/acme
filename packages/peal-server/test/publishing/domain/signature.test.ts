import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Schema } from "effect";

import { maxPostTextLength } from "#publishing/domain/post-text.ts";
import { SignatureIdSchema } from "#publishing/domain/signature-id.ts";
import {
  createSignature,
  defaultFor,
  signed,
  SignatureTextSchema,
  unsigned,
  withDefaultSignatures,
  withSignature,
} from "#publishing/domain/signature.ts";
import type { SignatureScope } from "#publishing/domain/signature.ts";
import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { contentOf } from "#test/publishing/support.ts";

const workspaceId = WorkspaceIdSchema.make(
  "00000000-0000-4000-8000-000000000002"
);

const now = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const mastodon = {
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-0000000000c1"),
  platform: "mastodon" as const,
};

const bluesky = {
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-0000000000c2"),
  platform: "bluesky" as const,
};

const linkedin = {
  channelId: ChannelIdSchema.make("00000000-0000-7000-8000-0000000000c3"),
  platform: "linkedin" as const,
};

let issued = 0;

const everywhere: SignatureScope = { _tag: "workspace" };

const signature = (
  text: string,
  scope: SignatureScope = everywhere,
  isDefault = true
) => {
  issued += 1;

  return createSignature(
    SignatureIdSchema.make(
      `00000000-0000-7000-8000-${String(issued).padStart(12, "0")}`
    ),
    workspaceId,
    { isDefault, name: `Signature ${String(issued)}`, scope, text },
    now
  );
};

const textsOf = (content: ReturnType<typeof contentOf>) => ({
  overrides: Object.fromEntries(
    content.overrides.map(({ channelId, text }) => [channelId, text])
  ),
  text: content.text,
});

describe("a signature's text", () => {
  it("goes under the post's, a blank line between them", () => {
    expect(signed("Hello", "— The studio")).toBe("Hello\n\n— The studio");
    expect(signed("Hello\n\n  ", "— The studio")).toBe("Hello\n\n— The studio");
  });

  it("is the whole text of a post that says nothing yet", () => {
    expect(signed("", "— The studio")).toBe("— The studio");
    expect(signed("  \n", "— The studio")).toBe("— The studio");
  });

  it("is never added twice", () => {
    const once = signed("Hello", "— The studio");

    expect(signed(once, "— The studio")).toBe(once);
    expect(signed(`${once}\n`, "— The studio")).toBe(`${once}\n`);
    // Composed or not, the same characters are the same signature.
    expect(signed("Hello\n\nCafé", "Café")).toBe("Hello\n\nCafé");
  });

  it("comes off the text that ends with it, and no other", () => {
    expect(unsigned("Hello\n\n— The studio", "— The studio")).toBe("Hello");
    expect(unsigned("— The studio", "— The studio")).toBe("");
    expect(unsigned("Hello", "— The studio")).toBe("Hello");
  });

  it("leaves a text it would make too long to keep as it is", () => {
    const long = "x".repeat(maxPostTextLength - 5);

    expect(signed(long, "— The studio")).toBe(long);
  });

  it("is neither empty nor padded", () => {
    const isText = Schema.is(SignatureTextSchema);

    expect(isText("— The studio")).toBeTruthy();
    expect(isText("")).toBeFalsy();
    expect(isText(" padded ")).toBeFalsy();
  });
});

describe("a channel's default signature", () => {
  const general = signature("General");

  const onMastodon = signature("On Mastodon", {
    _tag: "platform",
    platform: "mastodon",
  });

  const onChannel = signature("On this channel", {
    _tag: "channel",
    channelId: mastodon.channelId,
  });

  const spare = signature("Spare", everywhere, false);

  it("is its own, else its platform's, else the workspace's", () => {
    const all = [spare, general, onMastodon, onChannel];

    expect(defaultFor(all, mastodon)).toStrictEqual(Option.some(onChannel));
    expect(defaultFor([spare, general, onMastodon], mastodon)).toStrictEqual(
      Option.some(onMastodon)
    );
    expect(defaultFor(all, bluesky)).toStrictEqual(Option.some(general));
  });

  it("is none when no signature is a default", () => {
    expect(defaultFor([spare], mastodon)).toStrictEqual(Option.none());
  });
});

describe("a post's default signatures", () => {
  const general = signature("General");

  const onMastodon = signature("On Mastodon", {
    _tag: "platform",
    platform: "mastodon",
  });

  it("put the workspace's under the post's text", () => {
    const content = withDefaultSignatures(
      contentOf("Hello"),
      [bluesky, linkedin],
      [general]
    );

    expect(textsOf(content)).toStrictEqual({
      overrides: {},
      text: "Hello\n\nGeneral",
    });
  });

  it("give a channel with a default of its own a text of its own", () => {
    const content = withDefaultSignatures(
      contentOf("Hello"),
      [mastodon, bluesky],
      [general, onMastodon]
    );

    expect(textsOf(content)).toStrictEqual({
      overrides: { [mastodon.channelId]: "Hello\n\nOn Mastodon" },
      text: "Hello\n\nGeneral",
    });
  });

  it("sign the text a channel has instead of the post's", () => {
    const content = withDefaultSignatures(
      contentOf("Hello", {
        overrides: [
          [mastodon.channelId, "Hello, fediverse"],
          [bluesky.channelId, "Hello, sky"],
        ],
      }),
      [mastodon, bluesky],
      [general, onMastodon]
    );

    expect(textsOf(content)).toStrictEqual({
      overrides: {
        [bluesky.channelId]: "Hello, sky\n\nGeneral",
        [mastodon.channelId]: "Hello, fediverse\n\nOn Mastodon",
      },
      text: "Hello\n\nGeneral",
    });
  });

  it("change nothing when they are applied again", () => {
    const channels = [mastodon, bluesky, linkedin];
    const signatures = [general, onMastodon];

    const once = withDefaultSignatures(
      contentOf("Hello", {
        overrides: [[bluesky.channelId, "Hello, sky"]],
      }),
      channels,
      signatures
    );

    const twice = withDefaultSignatures(once, channels, signatures);

    expect(textsOf(twice)).toStrictEqual(textsOf(once));
  });

  it("sign a channel added later with its own, not with both", () => {
    const first = withDefaultSignatures(
      contentOf("Hello"),
      [bluesky],
      [general, onMastodon]
    );

    const later = withDefaultSignatures(
      first,
      [bluesky, mastodon],
      [general, onMastodon]
    );

    expect(textsOf(later)).toStrictEqual({
      overrides: { [mastodon.channelId]: "Hello\n\nOn Mastodon" },
      text: "Hello\n\nGeneral",
    });
  });

  it("leave a post alone where nothing is a default", () => {
    const content = contentOf("Hello", {
      overrides: [[mastodon.channelId, "Hello, fediverse"]],
    });

    const spare = signature("Spare", everywhere, false);

    expect(
      textsOf(withDefaultSignatures(content, [mastodon, bluesky], [spare]))
    ).toStrictEqual(textsOf(content));
  });

  it("keep the media and the texts of channels not chosen yet", () => {
    const content = contentOf("Hello", {
      overrides: [[linkedin.channelId, "Hello, colleagues"]],
    });

    const signedContent = withDefaultSignatures(content, [bluesky], [general]);

    expect(textsOf(signedContent)).toStrictEqual({
      overrides: { [linkedin.channelId]: "Hello, colleagues" },
      text: "Hello\n\nGeneral",
    });
    expect(signedContent.media).toStrictEqual(content.media);
  });
});

describe("a signature inserted by hand", () => {
  it("goes under the post's text and under each channel's own", () => {
    const chosen = signature("Chosen", everywhere, false);

    const content = withSignature(
      contentOf("Hello", {
        overrides: [[mastodon.channelId, "Hello, fediverse"]],
      }),
      chosen
    );

    expect(textsOf(content)).toStrictEqual({
      overrides: { [mastodon.channelId]: "Hello, fediverse\n\nChosen" },
      text: "Hello\n\nChosen",
    });
    expect(textsOf(withSignature(content, chosen))).toStrictEqual(
      textsOf(content)
    );
  });
});
