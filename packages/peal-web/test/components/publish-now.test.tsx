import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { PublishNowSummary } from "#components/posts/publish-now.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: Locale, channels: readonly string[]) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <PublishNowSummary channels={channels} />
    </NextIntlClientProvider>
  );
};

describe(PublishNowSummary, () => {
  it("names each channel the post goes out on", async () => {
    const html = await render("en", [
      "Studio (@studio.example.test)",
      "Client A (@client_a)",
    ]);

    expect(html).toContain("<li>Studio (@studio.example.test)</li>");
    expect(html).toContain("<li>Client A (@client_a)</li>");
    expect(html).toContain("is public on these 2 channels");
    expect(html).toContain("cannot be taken back from here");
  });

  it("says it in the reader's language", async () => {
    const html = await render("fr", ["Studio (@studio.example.test)"]);

    expect(html).toContain("devient publique sur ce canal");
  });
});
