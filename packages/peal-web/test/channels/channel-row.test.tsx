import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Channel } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { ChannelRow } from "#components/channels/channel-row.tsx";
import { loadMessages } from "#i18n/messages.ts";

const channel: Channel = {
  avatarUrl: null,
  connection: null,
  displayName: "Peal Example",
  handle: "@peal_example@social.example",
  id: "00000000-0000-7000-8000-000000000001",
  label: null,
  platform: "mastodon",
  status: { _tag: "refreshNeeded" },
  tokenExpiresAt: null,
};

const render = async (
  locale: "en" | "fr",
  props: Partial<Parameters<typeof ChannelRow>[0]> = {}
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <RegistryProvider>
        <ChannelRow
          channel={channel}
          workspaceId="5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
          canConnect
          canDisconnect
          {...props}
        />
      </RegistryProvider>
    </NextIntlClientProvider>
  );
};

// An Instagram channel through the way in given, in English.
const instagram = async (connection: "facebookLogin" | "instagramLogin") =>
  await render("en", {
    channel: {
      ...channel,
      connection,
      handle: "@studio_example",
      platform: "instagram",
    },
  });

describe(ChannelRow, () => {
  it("says the channel needs reconnecting, and offers to", async () => {
    const html = await render("en");

    expect(html).toContain("Reconnect needed");
    expect(html).toContain("Mastodon · @peal_example@social.example");
    expect(html).toContain(">Reconnect<");
    expect(html).toContain(">Disconnect<");
  });

  it("names the account in each button, for rows read out of order", async () => {
    const [english, french] = await Promise.all([render("en"), render("fr")]);

    expect(english).toContain(
      'aria-label="Reconnect @peal_example@social.example"'
    );
    expect(english).toContain(
      'aria-label="Disconnect @peal_example@social.example"'
    );
    expect(french).toContain(
      'aria-label="Reconnecter @peal_example@social.example"'
    );
    expect(french).toContain(
      'aria-label="Déconnecter @peal_example@social.example"'
    );
  });

  it("gives the date by which a token must be renewed, in French", async () => {
    const html = await render("fr", {
      channel: {
        ...channel,
        status: { _tag: "active" },
        tokenExpiresAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
      },
    });

    expect(html).toContain("Connecté");
    expect(html).toContain("À reconnecter avant le 1 décembre 2026");
  });

  it("offers nothing a member may not do", async () => {
    const html = await render("en", {
      canConnect: false,
      canDisconnect: false,
    });

    expect(html).not.toContain(">Reconnect<");
    expect(html).not.toContain(">Disconnect<");
  });

  it("says which way in an Instagram channel came through", async () => {
    await expect(instagram("instagramLogin")).resolves.toContain(
      "Instagram (Instagram Login) · @studio_example"
    );
    await expect(instagram("facebookLogin")).resolves.toContain(
      "Instagram (through a Facebook Page) · @studio_example"
    );
  });
});
