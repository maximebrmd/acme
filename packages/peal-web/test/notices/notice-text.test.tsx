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

  it("counts the comments read under a post, and opens their thread", async () => {
    const threadId = "00000000-0000-7000-8000-0000000000c1";

    const event = (count: number): NoticeEvent => ({
      _tag: "CommentsReceived",
      count,
      postId,
      threadId,
    });

    await expect(render("en", event(1))).resolves.toContain(
      `1 new comment under a post of Studio Nord. | Open the comments | /app/${workspaceId}/inbox/${threadId}`
    );
    await expect(render("en", event(3))).resolves.toContain(
      "3 new comments under a post of Studio Nord."
    );
    await expect(render("fr", event(1))).resolves.toContain(
      "1 nouveau commentaire sous une publication de Studio Nord. | Ouvrir les commentaires"
    );
    await expect(render("fr", event(12))).resolves.toContain(
      "12 nouveaux commentaires sous une publication de Studio Nord."
    );
  });

  it("counts the follow-ups that did not go out, says why, and opens their rule", async () => {
    const ruleId = "00000000-0000-7000-8000-00000000f001";

    const event = (
      count: number,
      reasons: readonly ("failed" | "unconfirmed" | "windowEnded")[]
    ): NoticeEvent => ({ _tag: "FollowUpsNotSent", count, reasons, ruleId });

    await expect(render("en", event(1, ["failed"]))).resolves.toContain(
      `A follow-up of a rule of Studio Nord did not go out: the platform refused it. | Open the follow-ups | /app/${workspaceId}/settings/follow-ups?rule=${ruleId}`
    );
    await expect(
      render("en", event(3, ["unconfirmed", "windowEnded"]))
    ).resolves.toContain(
      "3 follow-ups of a rule of Studio Nord did not go out: Peal could not tell whether they went out: check the platform, as Peal never sends them again; the platform put them off until their seven days ended."
    );
    await expect(render("fr", event(1, ["failed"]))).resolves.toContain(
      "Une relance d’une règle de Studio Nord n’est pas partie : la plateforme l’a refusée. | Ouvrir les relances"
    );
    await expect(render("fr", event(2, ["windowEnded"]))).resolves.toContain(
      "2 relances d’une règle de Studio Nord ne sont pas parties : la plateforme les a repoussées jusqu’à la fin de leurs sept jours."
    );
  });

  it("says why a rule that acts by itself stopped, and opens its page", async () => {
    const ruleId = "00000000-0000-7000-8000-00000000f001";

    await expect(
      render("en", {
        _tag: "FollowUpRuleStopped",
        reason: "channelGone",
        ruleId,
      })
    ).resolves.toContain(
      `A follow-up rule of Studio Nord stopped by itself: its channel was disconnected. | Open the follow-ups | /app/${workspaceId}/settings/follow-ups?rule=${ruleId}`
    );
    await expect(
      render("en", {
        _tag: "CommentRuleStopped",
        reason: "starterGone",
        ruleId,
      })
    ).resolves.toContain(
      `A comment reply rule of Studio Nord stopped by itself: whoever started it can no longer answer comments there. | Open the comment replies | /app/${workspaceId}/settings/comment-rules`
    );
    await expect(
      render("fr", {
        _tag: "FollowUpRuleStopped",
        reason: "starterGone",
        ruleId,
      })
    ).resolves.toContain(
      "Une règle de relance de Studio Nord s’est arrêtée d’elle-même : la personne qui l’a lancée ne peut plus y publier. | Ouvrir les relances"
    );
    await expect(
      render("fr", {
        _tag: "CommentRuleStopped",
        reason: "channelGone",
        ruleId,
      })
    ).resolves.toContain(
      "Une règle de réponse aux commentaires de Studio Nord s’est arrêtée d’elle-même : son canal a été déconnecté. | Ouvrir les réponses aux commentaires"
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

  it("says that deliveries to a webhook endpoint fail, and opens the webhooks", async () => {
    const failing: NoticeEvent = {
      _tag: "WebhookDeliveriesFailing",
      endpointId: "00000000-0000-7000-8000-000000000002",
      host: "hooks.example.com",
    };

    await expect(render("en", failing)).resolves.toContain(
      `A delivery to the webhook endpoint at hooks.example.com in Studio Nord failed for good: the system behind it missed an event. The endpoint is still on. Fix the receiver, then send the failed deliveries again from the delivery log. After 5 days of failures, Peal turns the endpoint off. | Open the webhooks | /app/${workspaceId}/settings/webhooks`
    );
    await expect(render("fr", failing)).resolves.toContain(
      "Une livraison vers le point de terminaison de webhook de hooks.example.com dans Studio Nord a échoué pour de bon"
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

  it("tells a boost that started, with its budget as money and its end", async () => {
    const event: NoticeEvent = {
      _tag: "AdBoostChanged",
      boostId: "00000000-0000-7000-8000-0000000000b1",
      budget: { amount: 5000, currency: "EUR" },
      budgetDigits: 2,
      change: "started",
      endsAt: DateTime.makeUnsafe("2026-11-17T22:59:00Z"),
      postId,
      reason: null,
    };

    await expect(render("en", event)).resolves.toContain(
      `A boost started in Studio Nord: it may spend up to its budget of €50.00, from the ad account’s payment method, until November 17, 2026. Pause or stop it at any time on the post’s page. | Open the post | /app/${workspaceId}/posts/${postId}`
    );
    await expect(render("fr", event)).resolves.toMatch(
      /Une mise en avant a démarré dans Studio Nord\u00A0: elle peut dépenser jusqu’à son budget de 50,00\s€, sur le moyen de paiement du compte publicitaire, jusqu’au 17 novembre 2026\./u
    );
  });

  it("says why a boost failed, and that nothing was spent", async () => {
    const event: NoticeEvent = {
      _tag: "AdBoostChanged",
      boostId: "00000000-0000-7000-8000-0000000000b1",
      budget: { amount: 5000, currency: "JPY" },
      budgetDigits: 0,
      change: "failed",
      endsAt: DateTime.makeUnsafe("2026-11-17T22:59:00Z"),
      postId,
      reason: "ceilingExceeded",
    };

    await expect(render("en", event)).resolves.toContain(
      "A boost in Studio Nord, with a budget of ¥5,000, could not be made: the monthly ceiling leaves too little room. Nothing ran, and nothing was spent."
    );
    await expect(
      render("en", { ...event, reason: "a code of the network" })
    ).resolves.toContain("could not be made: the ad network refused it.");
  });

  it("warns that an unconfirmed boost may be spending", async () => {
    const event: NoticeEvent = {
      _tag: "AdBoostChanged",
      boostId: "00000000-0000-7000-8000-0000000000b1",
      budget: { amount: 5000, currency: "EUR" },
      budgetDigits: 2,
      change: "unconfirmed",
      endsAt: DateTime.makeUnsafe("2026-11-17T22:59:00Z"),
      postId,
      reason: null,
    };

    await expect(render("en", event)).resolves.toContain(
      "It may be spending. Check it on the post’s page, and stop it there if it should not run. | Open the post"
    );
    await expect(render("fr", event)).resolves.toContain(
      "Elle dépense peut-être."
    );
  });

  it("sends a refused ad network sign-in to the ads page", async () => {
    const event: NoticeEvent = {
      _tag: "AdConnectionReconnectRequired",
      network: "meta",
    };

    await expect(render("en", event)).resolves.toContain(
      `Meta refused the sign-in that connects ad accounts to Studio Nord. Their campaigns and numbers are no longer read, and no boost can be made on them, until the person who signed in does so again. Boosts that run keep running at the network. | Open the ads | /app/${workspaceId}/ads`
    );
    await expect(render("fr", event)).resolves.toContain(
      `Meta a refusé la connexion qui relie des comptes publicitaires à Studio Nord. Leurs campagnes et leurs chiffres ne sont plus lus, et aucune mise en avant ne peut y être créée, tant que la personne qui s’était connectée ne le refait pas. Les mises en avant en cours continuent d’être diffusées par le réseau. | Ouvrir la publicité | /app/${workspaceId}/ads`
    );
  });
});
