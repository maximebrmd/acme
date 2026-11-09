import { describe, expect, it } from "@effect/vitest";
import type { Channel } from "acme-contract";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { CharacterCounters } from "#components/posts/character-counters.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { fitOn } from "#posts/character-count.ts";

const channel = (platform: Channel["platform"]): Channel => ({
  avatarUrl: null,
  displayName: null,
  handle: `@acme_${platform}`,
  id: `channel-${platform}`,
  platform,
  status: { _tag: "active" },
  tokenExpiresAt: null,
});

const render = async (locale: Locale, text: string) => {
  const messages = await loadMessages(locale);
  const channels = [channel("x"), channel("bluesky"), channel("instagram")];

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <CharacterCounters
        fits={channels.map((item) => ({
          channel: item,
          fit: fitOn(item.platform, text, 0),
        }))}
      />
    </NextIntlClientProvider>
  );
};

describe(CharacterCounters, () => {
  it("shows each platform's count, as the platform counts", async () => {
    const html = await render("en", "日".repeat(141));

    expect(html).toContain("282 of 280 characters");
    expect(html).toContain("141 of 300 characters");
    expect(html).toContain("Needs an image or a video");
  });

  it("speaks the reader's language", async () => {
    const html = await render("fr", "Bonjour");

    expect(html).toContain("7 sur 280 caractères");
    expect(html).toContain("@acme_x sur X");
  });

  it("asks for channels before there is anything to count", async () => {
    const messages = await loadMessages("en");

    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CharacterCounters fits={[]} />
      </NextIntlClientProvider>
    );

    expect(html).toContain("Pick channels to see how the text fits each one.");
  });
});
