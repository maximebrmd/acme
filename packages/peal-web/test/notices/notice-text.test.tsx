import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { NoticeEvent } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { loadMessages } from "#i18n/messages.ts";
import { useNoticeText } from "#notices/notice-text.ts";

const workspaceId = "5b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f";

const postId = "00000000-0000-7000-8000-000000000001";

const workspaces: ReadonlyMap<string, string> = new Map([
  [workspaceId, "Studio Nord"],
]);

const channel = { handle: "@peal_example", platform: "mastodon" } as const;

const Written = ({
  event,
  inWorkspace,
}: {
  readonly event: NoticeEvent;
  readonly inWorkspace: string;
}) => {
  const write = useNoticeText(workspaces);
  const { href, open, text } = write(event, inWorkspace);

  return (
    <p>
      {text} | {open} | {href}
    </p>
  );
};

const render = async (
  locale: "en" | "fr",
  event: NoticeEvent,
  inWorkspace = workspaceId
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <Written event={event} inWorkspace={inWorkspace} />
    </NextIntlClientProvider>
  );
};

describe(useNoticeText, () => {
  it("says why a post failed, in English and in French", async () => {
    const event: NoticeEvent = {
      _tag: "PostFailed",
      channel,
      postId,
      reason: "mediaRejected",
    };

    await expect(render("en", event)).resolves.toContain(
      `A post of Studio Nord did not go out on Mastodon (@peal_example): the platform refused one of its images or videos. | Open the post | /app/${workspaceId}/posts/${postId}`
    );
    await expect(render("fr", event)).resolves.toContain(
      "Une publication de Studio Nord n’est pas partie sur Mastodon (@peal_example) : la plateforme a refusé l’une de ses images ou vidéos. | Ouvrir la publication"
    );
  });

  it.each([
    {
      english:
        "its channel was disconnected from the workspace before it went out.",
      french:
        "son canal a été déconnecté de l’espace de travail avant son départ.",
      reason: "channelDisconnected",
    },
    {
      english:
        "its channel was turned off before it went out. Turn the channel back on, on the Channels page, then schedule it in a new post.",
      french:
        "son canal a été désactivé avant son départ. Réactivez le canal, sur la page Canaux, puis programmez-la dans une nouvelle publication.",
      reason: "channelDisabled",
    },
    {
      english:
        "one of its images or videos was deleted from the media library before it went out.",
      french:
        "l’une de ses images ou vidéos a été supprimée de la médiathèque avant son départ.",
      reason: "mediaRemoved",
    },
  ] as const)(
    "names $reason rather than a refused text",
    async ({ english, french, reason }) => {
      const event: NoticeEvent = {
        _tag: "PostFailed",
        channel,
        postId,
        reason,
      };

      const [inEnglish, inFrench] = await Promise.all([
        render("en", event),
        render("fr", event),
      ]);

      expect(inEnglish).toContain(english);
      expect(inEnglish).not.toContain("refused its text");
      expect(inFrench).toContain(french);
    }
  );

  it("asks to check an unconfirmed post before reposting it", async () => {
    const event: NoticeEvent = {
      _tag: "PostUnconfirmed",
      channel: null,
      postId,
    };

    await expect(render("en", event)).resolves.toContain(
      "A post of Studio Nord may have gone out on a disconnected channel. Check the platform before you post it again."
    );
    await expect(render("fr", event)).resolves.toContain(
      "Une publication de Studio Nord est peut-être partie sur un canal déconnecté. Vérifiez sur la plateforme avant de la republier."
    );
  });

  it("tells a published post", async () => {
    const html = await render("en", {
      _tag: "PostPublished",
      channel: { handle: "@peal.example", platform: "bluesky" },
      permalink: null,
      postId,
    });

    expect(html).toContain(
      "A post of Studio Nord is live on Bluesky (@peal.example)."
    );
  });

  it("dates the end of a channel's authorization in the reader's language", async () => {
    const event: NoticeEvent = {
      _tag: "ChannelReconnectSoon",
      channel,
      expiresAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
    };

    await expect(render("en", event)).resolves.toContain(
      `Mastodon (@peal_example) in Studio Nord must be reconnected by December 1, 2026: its authorization cannot be renewed. | Open the channels | /app/${workspaceId}/channels`
    );
    await expect(render("fr", event)).resolves.toContain(
      "Mastodon (@peal_example) dans Studio Nord doit être reconnecté avant le 1 décembre 2026 : son autorisation ne peut pas être renouvelée. | Ouvrir les canaux"
    );
  });

  it("says why a webhook endpoint was turned off, and opens the webhooks", async () => {
    const failing: NoticeEvent = {
      _tag: "WebhookEndpointDisabled",
      endpointId: "00000000-0000-7000-8000-000000000002",
      host: "hooks.example.com",
      reason: "failing",
    };

    await expect(render("en", failing)).resolves.toContain(
      `The webhook endpoint at hooks.example.com in Studio Nord was turned off: every delivery had failed for 5 days. Fix the receiver, then turn it back on. | Open the webhooks | /app/${workspaceId}/settings/webhooks`
    );
    await expect(render("fr", failing)).resolves.toContain(
      "Le point de terminaison de webhook de hooks.example.com dans Studio Nord a été désactivé : toutes les livraisons échouaient depuis 5 jours. Corrigez le destinataire, puis réactivez-le. | Ouvrir les webhooks"
    );
    await expect(
      render("en", { ...failing, reason: "gone" })
    ).resolves.toContain(
      "was turned off: it answered 410 Gone, which asks for no more deliveries."
    );
  });

  it("asks to reconnect a channel, in a workspace the reader left", async () => {
    const html = await render(
      "fr",
      { _tag: "ChannelReconnectRequired", channel },
      "0b1c5f7e-3d2a-4c1b-9e8f-7a6b5c4d3e2f"
    );

    expect(html).toContain(
      "Mastodon (@peal_example) dans un espace de travail que vous avez quitté doit être reconnecté"
    );
  });
});
