import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { maxSignatureLength } from "peal-contract";
import type { SocialChannel, Signature } from "peal-contract";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DefaultSignaturesView } from "#components/posts/default-signatures.tsx";
import { LinkWarnings } from "#components/posts/link-warnings.tsx";
import { SignatureMenuView } from "#components/posts/signature-menu.tsx";
import {
  SignatureFieldsView,
  SignatureItemView,
} from "#components/signatures/signature-views.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { emptySignatureDraft } from "#signatures/draft.ts";

const render = async (locale: "en" | "fr", view: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>
  );

// The texts among `expected` that the markup lacks.
const missingFrom = (html: string, expected: readonly string[]) =>
  expected.filter((text) => !html.includes(text));

const noop = () => {
  // Nothing changes while rendering to markup.
};

const mastodon: SocialChannel = {
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: "@peal@mastodon.example",
  id: "c1",
  label: null,
  platform: "mastodon",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

const signature = (
  scope: Signature["scope"],
  isDefault: boolean
): Signature => ({
  createdAt: DateTime.makeUnsafe("2026-11-01T09:00:00Z"),
  id: "s1",
  isDefault,
  name: "Team sign-off",
  scope,
  text: "The Peal team\n#synthetic",
});

describe(SignatureItemView, () => {
  it("shows a default signature of the workspace, with its text", async () => {
    const html = await render(
      "en",
      <ul>
        <SignatureItemView
          channels={[mastodon]}
          signature={signature({ _tag: "workspace" }, true)}
          actions={<button type="button">Edit</button>}
        />
      </ul>
    );

    expect(
      missingFrom(html, [
        "Team sign-off",
        "Default",
        "For every channel of the workspace",
        "The Peal team\n#synthetic",
        "whitespace-pre-wrap",
      ])
    ).toStrictEqual([]);
  });

  it("says which platform or channel a signature is for", async () => {
    const platform = await render(
      "en",
      <ul>
        <SignatureItemView
          channels={[mastodon]}
          signature={signature(
            { _tag: "platform", platform: "bluesky" },
            false
          )}
        />
      </ul>
    );

    expect(platform).toContain("For the Bluesky channels");
    expect(platform).not.toContain("Default");

    const channel = await render(
      "fr",
      <ul>
        <SignatureItemView
          channels={[mastodon]}
          signature={signature({ _tag: "channel", channelId: "c1" }, false)}
        />
      </ul>
    );

    expect(channel).toContain("Pour @peal@mastodon.example sur Mastodon");
  });

  it("says so when its channel is no longer connected", async () => {
    const html = await render(
      "en",
      <ul>
        <SignatureItemView
          channels={[]}
          signature={signature({ _tag: "channel", channelId: "gone" }, false)}
        />
      </ul>
    );

    expect(html).toContain("For a channel that is no longer connected");
  });
});

describe(SignatureFieldsView, () => {
  it("counts the text against the limit, and asks what it is for", async () => {
    const html = await render(
      "en",
      <SignatureFieldsView
        channels={[mastodon]}
        draft={{ ...emptySignatureDraft, name: "Team", text: "The team" }}
        error={null}
        disabled={false}
        idPrefix="new"
        onChange={noop}
      />
    );

    expect(
      missingFrom(html, [
        "8 of 2,000 characters",
        "Every channel of the workspace",
        "The channels of one platform",
        "One channel",
        "Add to new posts by default",
        'aria-describedby="new-signature-text-count"',
      ])
    ).toStrictEqual([]);

    expect(html.match(/type="radio"/gu)).toHaveLength(3);
    expect(html).not.toContain('aria-invalid="true"');
  });

  it("marks a text over the limit", async () => {
    const html = await render(
      "en",
      <SignatureFieldsView
        channels={[]}
        draft={{
          ...emptySignatureDraft,
          text: "x".repeat(maxSignatureLength + 1),
        }}
        error={null}
        disabled={false}
        idPrefix="new"
        onChange={noop}
      />
    );

    expect(html).toContain("2,001 of 2,000 characters");
    expect(html).toContain('aria-invalid="true"');
  });

  it("asks for the platform or the channel once that scope is chosen", async () => {
    const platform = await render(
      "en",
      <SignatureFieldsView
        channels={[mastodon]}
        draft={{ ...emptySignatureDraft, scope: "platform" }}
        error={null}
        disabled={false}
        idPrefix="new"
        onChange={noop}
      />
    );

    expect(platform).toContain("Choose a platform");

    const channel = await render(
      "fr",
      <SignatureFieldsView
        channels={[]}
        draft={{ ...emptySignatureDraft, scope: "channel" }}
        error={{ key: "nameTaken" }}
        disabled={false}
        idPrefix="new"
        onChange={noop}
      />
    );

    expect(
      missingFrom(channel, [
        "L’espace de travail n’a pas encore de canal connecté.",
        "L’espace de travail a déjà une signature de ce nom.",
      ])
    ).toStrictEqual([]);
  });
});

describe(SignatureMenuView, () => {
  it("opens from a button named for what it adds", async () => {
    const html = await render(
      "en",
      <SignatureMenuView
        channels={[mastodon]}
        disabled={false}
        signatures={[signature({ _tag: "workspace" }, true)]}
        onInsert={noop}
      />
    );

    expect(html).toContain("Signature</button>");
    expect(html).toContain('aria-haspopup="menu"');
  });
});

describe(DefaultSignaturesView, () => {
  it("offers, ticked, to add the default signature, naming it", async () => {
    const html = await render(
      "en",
      <DefaultSignaturesView
        disabled={false}
        names={["Team sign-off"]}
        wanted
        onChange={noop}
      />
    );

    expect(
      missingFrom(html, [
        "Add the default signature when the post is saved",
        "Team sign-off goes under the text when the post is first saved.",
        'aria-checked="true"',
      ])
    ).toStrictEqual([]);
  });

  it("names several defaults, in the reader's language", async () => {
    const html = await render(
      "fr",
      <DefaultSignaturesView
        disabled={false}
        names={["Équipe", "Mentions"]}
        wanted={false}
        onChange={noop}
      />
    );

    expect(
      missingFrom(html, [
        "Ajouter les signatures par défaut à l’enregistrement de la publication",
        "Équipe et Mentions sont placées sous le texte",
        'aria-checked="false"',
      ])
    ).toStrictEqual([]);
  });

  it("shows nothing in a workspace without a default signature", async () => {
    await expect(
      render(
        "en",
        <DefaultSignaturesView
          disabled={false}
          names={[]}
          wanted
          onChange={noop}
        />
      )
    ).resolves.toBe("");
  });
});

describe(LinkWarnings, () => {
  it("names each piece that would not work as a link, in a status region", async () => {
    const html = await render(
      "en",
      <LinkWarnings
        texts={[
          "Read htp://example.com and https://example.org",
          "Here too: htp://example.com, and https//example.net",
        ]}
      />
    );

    expect(
      missingFrom(html, [
        "<output",
        'aria-live="polite"',
        "This does not look like a working link: htp://example.com",
        "This does not look like a working link: https//example.net",
      ])
    ).toStrictEqual([]);

    expect(html.match(/<li/gu)).toHaveLength(2);
  });

  it("keeps the region, empty, while every link works", async () => {
    const html = await render(
      "fr",
      <LinkWarnings texts={["Lisez https://example.com", "@peal #lien"]} />
    );

    expect(html).toContain("<output");
    expect(html).not.toContain("<li");
  });
});
