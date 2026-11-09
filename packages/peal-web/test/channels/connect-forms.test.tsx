import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { InstagramConnection, Platform } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { ConnectForms } from "#components/channels/connect-forms.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (
  locale: "en" | "fr",
  platforms: readonly Platform[],
  instagramConnections: readonly InstagramConnection[] = []
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <RegistryProvider>
        <ConnectForms
          instagramConnections={instagramConnections}
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

  it("offers Instagram Login first, and a Facebook Page as the other way", async () => {
    const html = await render(
      "en",
      ["instagram", "facebook"],
      ["instagramLogin", "facebookLogin"]
    );

    expect(html).toContain(">Connect with Instagram<");
    expect(html).toContain(">Connect through a Facebook Page<");
    expect(html).toContain("no Facebook Page needed");
    expect(html).toContain(">Connect Facebook Pages<");
    expect(html.indexOf("Connect with Instagram")).toBeLessThan(
      html.indexOf("Connect through a Facebook Page")
    );
  });

  it("offers only the way in the server has", async () => {
    const html = await render("fr", ["instagram"], ["facebookLogin"]);

    expect(html).toContain(">Passer par une Page Facebook<");
    expect(html).not.toContain("Se connecter avec Instagram");
  });

  it("writes the buttons in French", async () => {
    const html = await render("fr", ["linkedin", "x"]);

    expect(html).toContain(">Connecter LinkedIn<");
    expect(html).toContain(">Connecter X<");
    expect(html).toContain("tous les 60 jours");
  });
});
