import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Platform } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { ConnectForms } from "#components/channels/connect-forms.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", platforms: readonly Platform[]) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <RegistryProvider>
        <ConnectForms
          platforms={platforms}
          workspaceId="5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
        />
      </RegistryProvider>
    </NextIntlClientProvider>
  );
};

describe(ConnectForms, () => {
  it("offers every platform the server connects", async () => {
    const html = await render("en", ["x", "linkedin", "bluesky", "mastodon"]);

    expect(html).toContain(">Connect Mastodon<");
    expect(html).toContain(">Connect Bluesky<");
    expect(html).toContain(">Connect LinkedIn<");
    expect(html).toContain(">Connect X<");
    expect(html).toContain("again every 60 days");
  });

  it("leaves out the platforms the server is not set up for", async () => {
    const html = await render("en", ["mastodon"]);

    expect(html).toContain(">Connect Mastodon<");
    expect(html).not.toContain("Bluesky");
    expect(html).not.toContain("LinkedIn");
    expect(html).not.toContain(">Connect X<");
  });

  it("writes the buttons in French", async () => {
    const html = await render("fr", ["linkedin", "x"]);

    expect(html).toContain(">Connecter LinkedIn<");
    expect(html).toContain(">Connecter X<");
    expect(html).toContain("tous les 60 jours");
  });
});
