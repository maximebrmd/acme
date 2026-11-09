import { describe, expect, it } from "@effect/vitest";
import { PostContentInvalid } from "acme-contract";
import type { Channel, ContentViolation } from "acme-contract";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { ComposerErrors } from "#components/posts/composer-errors.tsx";
import {
  takesOptions,
  TargetOptionsPanel,
} from "#components/posts/target-options-panel.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { initialValues } from "#posts/target-options.ts";
import type { OptionValues } from "#posts/target-options.ts";

const channel = (
  id: string,
  platform: Channel["platform"],
  handle: string
): Channel => ({
  avatarUrl: null,
  displayName: null,
  handle,
  id,
  platform,
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

const youtube = channel(
  "00000000-0000-7000-8000-000000000001",
  "youtube",
  "@acme_videos"
);

const tiktok = channel(
  "00000000-0000-7000-8000-000000000002",
  "tiktok",
  "@acme_clips"
);

const mastodon = channel(
  "00000000-0000-7000-8000-000000000003",
  "mastodon",
  "@acme@social.example"
);

const violations: readonly ContentViolation[] = [
  {
    _tag: "optionMissing",
    channelId: youtube.id,
    field: "madeForKids",
    platform: "youtube",
  },
  {
    _tag: "optionTooLong",
    channelId: youtube.id,
    field: "title",
    length: 120,
    maximum: 100,
    platform: "youtube",
  },
  {
    _tag: "optionInvalid",
    channelId: tiktok.id,
    field: "brandContent",
    platform: "tiktok",
  },
];

const render = async (
  locale: Locale,
  values: Readonly<Record<string, OptionValues>> = {}
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TargetOptionsPanel
        channels={[youtube, mastodon, tiktok]}
        disabled={false}
        valuesOf={(shown) => values[shown.id] ?? initialValues(shown.platform)}
        violations={violations}
        onChange={() => {
          // Rendered once, never changed.
        }}
      />
    </NextIntlClientProvider>
  );
};

describe(TargetOptionsPanel, () => {
  it("shows the fields of each channel whose platform takes options", async () => {
    const html = await render("en");

    expect(html).toContain("@acme_videos on YouTube: options");
    expect(html).toContain("Title (required)");
    expect(html).toContain("Made for kids (required)");
    expect(html).toContain("Who can view this post (required)");
    expect(html).not.toContain("@acme@social.example");
  });

  it("starts TikTok's interactions off, and its disclosure untold", async () => {
    const html = await render("en");

    expect(html).toContain("Allow comments");
    expect(html).toContain('aria-checked="false"');
    // Under the disclosure, which is off.
    expect(html).not.toContain("Your brand");
  });

  it("shows under each field what scheduling refused", async () => {
    const html = await render("en");

    expect(html).toContain("Required to schedule.");
    expect(html).toContain("120 of 100 characters.");
    expect(html).toContain('aria-invalid="true"');
  });

  it("shows whose brand once the disclosure is on", async () => {
    const html = await render("en", {
      [tiktok.id]: {
        ...initialValues("tiktok"),
        brandContent: true,
        commercialContent: true,
        privacyLevel: "SELF_ONLY",
      },
    });

    expect(html).toContain("Your brand");
    expect(html).toContain(
      "Branded content cannot be visible to you only: choose who can view it."
    );
  });

  it("speaks the reader's language", async () => {
    const html = await render("fr");

    expect(html).toContain("@acme_videos sur YouTube : options");
    expect(html).toContain("Titre (obligatoire)");
    expect(html).toContain("Obligatoire pour programmer.");
    expect(html).toContain("Autoriser les commentaires");
  });

  it("shows only for platforms that take options", () => {
    expect(takesOptions([mastodon])).toBeFalsy();
    expect(takesOptions([mastodon, youtube])).toBeTruthy();
  });
});

describe("the composer's errors about options", () => {
  it("name the option, channel by channel", async () => {
    const messages = await loadMessages("en");

    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ComposerErrors
          channels={[youtube, tiktok, mastodon]}
          failure={
            new PostContentInvalid({
              violations: [
                ...violations,
                {
                  _tag: "optionsForOtherPlatform",
                  channelId: mastodon.id,
                  optionsPlatform: "tiktok",
                  platform: "mastodon",
                },
              ],
            })
          }
        />
      </NextIntlClientProvider>
    );

    expect(html).toContain(
      "@acme_videos on YouTube: Made for kids is required."
    );
    expect(html).toContain(
      "@acme_videos on YouTube: Title, 120 of 100 characters."
    );
    expect(html).toContain(
      "@acme_clips on TikTok: Branded content cannot be visible to you only"
    );
    expect(html).toContain(
      "@acme@social.example on Mastodon: these options are for TikTok."
    );
  });
});
