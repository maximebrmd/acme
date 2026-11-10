import { RegistryProvider } from "@effect/atom-react";
import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Channel } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { ChannelRow } from "#components/channels/channel-row.tsx";
import { RenameChannelFields } from "#components/channels/rename-channel.tsx";
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

const off: Channel = {
  ...channel,
  status: { _tag: "disabled", refreshNeeded: false },
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

  it("puts the workspace's name first, and keeps the platform's beside it", async () => {
    const html = await render("en", {
      channel: { ...channel, label: "Client A", status: { _tag: "active" } },
    });

    expect(html).toContain(">Client A<");
    expect(html).toContain(
      "Mastodon · Peal Example · @peal_example@social.example"
    );
    expect(html).toContain(
      'aria-label="Rename Client A (@peal_example@social.example)"'
    );
    expect(html).toContain(
      'aria-label="Turn off Client A (@peal_example@social.example)"'
    );
  });

  it("offers to rename and to turn off a channel that is on", async () => {
    const [english, french] = await Promise.all([
      render("en", { channel: { ...channel, status: { _tag: "active" } } }),
      render("fr", { channel: { ...channel, status: { _tag: "active" } } }),
    ]);

    expect(english).toContain(">Rename<");
    expect(english).toContain(">Turn off<");
    expect(english).not.toContain(">Turn on<");
    expect(french).toContain(">Renommer<");
    expect(french).toContain(">Désactiver<");
  });

  it("says how to turn a channel back on, and offers to", async () => {
    const html = await render("en", { channel: off });

    expect(html).toContain("Turned off");
    expect(html).toContain(
      "Nothing goes out on this channel while it is off. Choose Turn on to post on it again."
    );
    expect(html).toContain(">Turn on<");
    expect(html).not.toContain(">Turn off<");
    expect(html).not.toContain("reconnecting once");
  });

  it("says it in French", async () => {
    const html = await render("fr", { channel: off });

    expect(html).toContain("Choisissez Réactiver pour y publier à nouveau.");
    expect(html).toContain(">Réactiver<");
  });

  it("tells a member who may not turn it on who can", async () => {
    const html = await render("en", {
      canConnect: false,
      canDisconnect: false,
      channel: off,
    });

    expect(html).toContain(
      "An owner or an admin of the workspace can turn it back on."
    );
    expect(html).not.toContain(">Turn on<");
    expect(html).not.toContain(">Rename<");
  });

  it("warns that a channel turned off will need reconnecting", async () => {
    const html = await render("en", {
      channel: {
        ...channel,
        status: { _tag: "disabled", refreshNeeded: true },
      },
    });

    expect(html).toContain("it will need reconnecting once the channel is on.");
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

const fields = async (locale: "en" | "fr", value: string) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <RenameChannelFields
        id="name"
        value={value}
        disabled={false}
        onChange={() => {
          // The dialog keeps what is typed.
        }}
      />
    </NextIntlClientProvider>
  );

describe(RenameChannelFields, () => {
  it("says the name stays in Peal, in both languages", async () => {
    const [english, french] = await Promise.all([
      fields("en", "Client A"),
      fields("fr", "Client A"),
    ]);

    expect(english).toContain('value="Client A"');
    expect(english).toContain(
      "Shown in Peal only, beside the account’s handle, and sent to no platform."
    );
    expect(english).toContain('aria-describedby="name-hint"');
    expect(english).not.toContain("longer than");
    expect(french).toContain(
      "Affiché dans Peal seulement, à côté de l’identifiant du compte, et envoyé à aucune plateforme."
    );
  });

  it("says when a name is too long", async () => {
    const html = await fields("en", "a".repeat(61));

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("This name is longer than 60 characters.");
  });
});
