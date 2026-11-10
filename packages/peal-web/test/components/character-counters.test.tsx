import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import type { Channel } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { CharacterCounters } from "#components/posts/character-counters.tsx";
import { loadMessages } from "#i18n/messages.ts";
import { fitOn } from "#posts/character-count.ts";

const channel = (platform: Channel["platform"]): Channel => ({
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: `@peal_${platform}`,
  id: `channel-${platform}`,
  label: null,
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

  it("announces how many channels refuse the post, not every count", async () => {
    const html = await render("en", "日".repeat(141));

    // X is over its limit and Instagram needs media; Bluesky takes it.
    // An output element is a status: a polite live region of its own.
    expect(html).toContain(
      '<output class="sr-only">2 channels would refuse the post as it is.</output>'
    );
    expect(html).not.toContain("aria-live");
    expect(html.match(/<output/gu)).toHaveLength(1);
  });

  it("speaks the reader's language", async () => {
    const html = await render("fr", "Bonjour");

    expect(html).toContain("7 sur 280 caractères");
    expect(html).toContain("@peal_x sur X");
    expect(html).toContain("1 canal refuserait la publication en l’état.");
  });

  it("names a channel as its workspace does, with its handle beside", async () => {
    const messages = await loadMessages("en");
    const named = { ...channel("bluesky"), label: "Client A" };

    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CharacterCounters
          fits={[{ channel: named, fit: fitOn("bluesky", "Hello", 0) }]}
        />
      </NextIntlClientProvider>
    );

    expect(html).toContain("Client A (@peal_bluesky) on Bluesky");
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
