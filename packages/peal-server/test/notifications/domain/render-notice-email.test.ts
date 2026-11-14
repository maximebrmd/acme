import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option } from "effect";

import type {
  NoticeChannel,
  NoticeEvent,
} from "#notifications/domain/notice-event.ts";
import { PostFailureReasonSchema } from "#notifications/domain/notice-event.ts";
import { renderNoticeEmail } from "#notifications/domain/render-notice-email.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

const url = "https://app.example.test/app/0b1c/posts/0190";

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const mastodon: Option.Option<NoticeChannel> = Option.some({
  handle: "@alice@social.example",
  platform: "mastodon",
});

const render = (event: NoticeEvent, locale: Locale) =>
  renderNoticeEmail({ event, locale, url, workspaceName: "Studio Nord" });

const locales: readonly Locale[] = ["en", "fr"];

describe(renderNoticeEmail, () => {
  const withdrawn: NoticeEvent = {
    _tag: "SubscriptionWithdrawn",
    plan: "starter",
    refunded: { amount: 810, currency: "eur" },
    withdrawnAt: DateTime.makeUnsafe("2026-11-04T08:15:00Z"),
  };

  it("sends members whose channel's messages were turned off to the inbox's own steps", () => {
    const bluesky = { handle: "@studio.example", platform: "bluesky" } as const;

    const english = render(
      { _tag: "MessagesTurnedOff", channel: bluesky },
      "en"
    );

    const french = render(
      { _tag: "MessagesTurnedOff", channel: bluesky },
      "fr"
    );

    expect(english.text).toContain(
      "choose Read its messages for the channel in the inbox, then Allow, on Bluesky"
    );
    expect(french.text).toContain(
      "choisissez Lire ses messages pour le canal dans la boîte de réception, puis Autoriser, sur Bluesky"
    );
    expect(`${english.text}${french.text}`).not.toMatch(/\{\w+\}/u);
  });

  it("acknowledges a withdrawal with its date, time and refund", () => {
    const english = render(withdrawn, "en");

    expect(english.subject).toBe(
      "Withdrawal received: your Starter subscription has ended"
    );
    expect(english.text).toContain("on November 4, 2026 at 8:15 AM UTC");
    expect(english.text).toContain("€8.10 is refunded");
  });

  it("acknowledges a withdrawal in French", () => {
    const french = render(withdrawn, "fr");

    expect(french.subject).toBe(
      "Rétractation reçue : votre abonnement Starter a pris fin"
    );
    expect(french.text).toContain("le 4 novembre 2026 à 08:15 UTC");
    expect(french.text).toContain("8,10\u00A0€ vous est remboursé");
  });

  it("confirms a subscription with its price and the right to withdraw", () => {
    const email = render(
      {
        _tag: "SubscriptionStarted",
        interval: "month",
        plan: "pro",
        price: { amount: 1500, currency: "eur" },
        startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
        trialEnd: Option.none(),
      },
      "en"
    );

    expect(email.subject).toBe("Your Pro subscription has started");
    expect(email.text).toContain("for €15.00 a month, VAT included");
    expect(email.text).toContain("Withdraw from contract here");
  });

  it("reminds a yearly renewal with what it will charge, VAT included", () => {
    const email = render(
      {
        _tag: "SubscriptionRenewing",
        plan: "business",
        price: { amount: 30_000, currency: "eur" },
        renewsAt: DateTime.makeUnsafe("2027-01-31T00:00:00Z"),
      },
      "fr"
    );

    expect(email.subject).toBe(
      "Votre abonnement annuel Business se renouvelle le 31 janvier 2027 à 00:00 UTC"
    );
    expect(email.text).toContain("300,00\u00A0€ TTC");
    // The last day to refuse the renewal, set apart in a box (Code de la
    // consommation L215-1).
    expect(email.text).toContain(
      "\n\nDate limite de non-reconduction : 31 janvier 2027 à 00:00 UTC\n\n"
    );
    expect(email.html).toMatch(
      /<p style="[^"]*border:2px solid[^"]*">Date limite de non-reconduction : 31 janvier 2027 à 00:00 UTC<\/p>/u
    );
    expect(email.text).toContain("Résilier votre contrat");
  });

  it("gives the contract's number with the confirmation and the reminder", () => {
    const started = render(
      {
        _tag: "SubscriptionStarted",
        interval: "month",
        plan: "pro",
        price: { amount: 1500, currency: "eur" },
        reference: "7K3M-9QXD-42TN",
        startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
        trialEnd: Option.none(),
      },
      "en"
    );

    expect(started.text).toContain("Contract number: 7K3M-9QXD-42TN");
    expect(started.text).toContain("at the foot of every page");

    const renewing = render(
      {
        _tag: "SubscriptionRenewing",
        plan: "business",
        price: { amount: 30_000, currency: "eur" },
        reference: "7K3M-9QXD-42TN",
        renewsAt: DateTime.makeUnsafe("2027-01-31T00:00:00Z"),
      },
      "fr"
    );

    expect(renewing.text).toContain("Numéro de contrat : 7K3M-9QXD-42TN");
  });

  it("lists what a trial's end leaves beyond the free plan", () => {
    const ending = {
      _tag: "TrialEnding",
      endsAt: DateTime.makeUnsafe("2026-11-23T10:00:00Z"),
      over: [
        { allowed: 3, limit: "channels", used: 8 },
        { allowed: 2, limit: "members", used: 5 },
        { allowed: 500_000_000, limit: "mediaStorage", used: 1_200_000_000 },
      ],
      plan: "pro",
    } as const;

    expect(render(ending, "en").text).toContain(
      "Today it holds more than the free plan allows: 8 channels (3 allowed), 5 members (2 allowed), 1.2 GB of media (500 MB allowed). From that day, nothing is scheduled or published until it is back within the free plan: posts already scheduled fail when due, and can be posted again afterwards. Add a payment method, or choose which accounts stay, on the billing page."
    );
    expect(render(ending, "fr").text).toContain(
      "Aujourd’hui, il dépasse ce que permet l’offre gratuite : 8 canaux (3 permis), 5 membres (2 permis), 1,2\u202FGo de médias (500\u202FMo permis). À partir de ce jour, rien n’est programmé ni publié tant qu’il n’est pas revenu dans l’offre gratuite : les publications déjà programmées échouent à leur échéance, et peuvent être republiées ensuite. Ajoutez un moyen de paiement, ou choisissez les comptes qui restent, sur la page de facturation."
    );

    const within = render({ ...ending, over: [] }, "en").text;

    expect(within).toContain(
      "It holds nothing beyond what the free plan allows, and keeps its content."
    );
    expect(within).not.toContain("Today it holds more");
  });

  it("confirms per-account pricing with its rates, charging nothing now", () => {
    const started = {
      _tag: "SubscriptionStarted",
      interval: "month",
      plan: "payAsYouGo",
      price: { amount: 0, currency: "usd" },
      rates: {
        bands: [
          { monthly: 0, upTo: 2 },
          { monthly: 500, upTo: 10 },
          { monthly: 300, upTo: 100 },
          { monthly: 100, upTo: null },
        ],
        currency: "usd",
        freeAccounts: 2,
      },
      reference: "7K3M-9QXD-42TN",
      startedAt: DateTime.makeUnsafe("2026-11-13T10:00:00Z"),
      trialEnd: Option.none(),
    } as const;

    const english = render(started, "en");

    expect(english.subject).toBe("Per-account pricing has started");
    expect(english.text).toContain(
      "accounts 1 to 2 free, accounts 3 to 10 at $5.00 a month each, accounts 11 to 100 at $3.00 a month each, accounts 101 and up at $1.00 a month each, excluding tax"
    );
    expect(english.text).toContain("Nothing is charged now");
    expect(english.text).toContain("Contract number: 7K3M-9QXD-42TN");
    expect(render(started, "fr").text).toContain(
      "comptes 1 à 2 gratuits, comptes 3 à 10 à 5,00\u00A0$US par mois chacun"
    );
  });

  it("asks for a payment method before the grace's day", () => {
    const needed = {
      _tag: "PaymentMethodNeeded",
      accounts: 5,
      allowed: 2,
      graceUntil: DateTime.makeUnsafe("2027-01-31T00:00:00Z"),
    } as const;

    expect(render(needed, "en").subject).toBe(
      "Add a payment method to Studio Nord before January 31, 2027 at 12:00 AM UTC"
    );
    expect(render(needed, "en").text).toContain(
      "Studio Nord holds 5 connected accounts, more than the 2 the free tier includes"
    );
    expect(render(needed, "fr").text).toContain(
      "Studio Nord compte 5 comptes connectés, plus que les 2 de l’offre gratuite"
    );
  });

  it("tells a legacy plan's retirement, with its last day, in both languages", () => {
    const retiring = {
      _tag: "PlansRetiring",
      endsAt: DateTime.makeUnsafe("2027-01-01T00:00:00Z"),
      plan: "starter",
    } as const;

    expect(render(retiring, "en").subject).toBe(
      "The Starter plan of Studio Nord ends on January 1, 2027 at 12:00 AM UTC"
    );
    expect(render(retiring, "en").text).toContain(
      "nothing after that day is charged: the unused part of what was paid for beyond it is refunded to the payment method it was paid with"
    );
    expect(render(retiring, "en").text).not.toContain(
      "nothing more is charged"
    );
    expect(render(retiring, "fr").text).toContain(
      "rien n’est facturé au-delà de ce jour"
    );
    expect(render(retiring, "fr").subject).toBe(
      "La formule Starter de Studio Nord prend fin le 1 janvier 2027 à 00:00 UTC"
    );
  });

  it("tells a trial's end and a cancellation's", () => {
    expect(
      render(
        {
          _tag: "TrialEnding",
          endsAt: DateTime.makeUnsafe("2026-11-23T10:00:00Z"),
          over: [],
          plan: "pro",
        },
        "en"
      ).subject
    ).toBe("Your Pro trial ends on November 23, 2026 at 10:00 AM UTC");

    expect(
      render(
        {
          _tag: "SubscriptionCancelled",
          endsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
          plan: "agency",
        },
        "fr"
      ).subject
    ).toBe(
      "Votre abonnement Agency est résilié : il prend fin le 1 décembre 2026 à 00:00 UTC"
    );
  });

  it("tells that a webhook endpoint was turned off, by its host and why", () => {
    const failing = render(
      {
        _tag: "WebhookEndpointDisabled",
        endpointId: "00000000-0000-7000-8000-000000000051",
        host: "hooks.example.com",
        reason: "failing",
      },
      "en"
    );

    expect(failing.subject).toBe(
      "Webhook endpoint turned off: hooks.example.com"
    );
    expect(failing.text).toContain(
      "Peal turned off the webhook endpoint at hooks.example.com in Studio Nord: every delivery to it failed for 5 days."
    );
    expect(failing.text).toContain(url);

    const gone = render(
      {
        _tag: "WebhookEndpointDisabled",
        endpointId: "00000000-0000-7000-8000-000000000051",
        host: "hooks.example.com",
        reason: "gone",
      },
      "fr"
    );

    expect(gone.subject).toBe(
      "Point de terminaison de webhook désactivé : hooks.example.com"
    );
    expect(gone.text).toContain(
      "Peal a désactivé le point de terminaison de webhook hooks.example.com dans Studio Nord : il a répondu 410 Gone, ce qui demande de ne plus rien lui envoyer."
    );
  });

  it("asks to reconnect a channel, in English", () => {
    const email = render(
      {
        _tag: "ChannelReconnectRequired",
        channel: { handle: "@alice@social.example", platform: "mastodon" },
      },
      "en"
    );

    expect(email.subject).toBe("Reconnect @alice@social.example on Mastodon");
    expect(email.text).toContain(
      "Peal can no longer post as @alice@social.example on Mastodon in Studio Nord"
    );
    expect(email.text).toContain(`Reconnect the account: ${url}`);
    expect(email.html).toContain(`href="${url}"`);
  });

  it("gives the expiry in the reader's language, in UTC", () => {
    const email = render(
      {
        _tag: "ChannelReconnectSoon",
        channel: { handle: "@bob.test", platform: "bluesky" },
        expiresAt: DateTime.makeUnsafe("2026-12-01T09:30:00Z"),
      },
      "fr"
    );

    expect(email.subject).toBe(
      "Reconnectez @bob.test sur Bluesky avant le 1 décembre 2026 à 09:30 UTC"
    );
    expect(email.html).toContain('<html lang="fr">');
  });

  const published: NoticeEvent = {
    _tag: "PostPublished",
    channel: mastodon,
    permalink: Option.some("https://social.example/@alice/1"),
    postId,
  };

  it("tells a published post, in English", () => {
    const english = render(published, "en");

    expect(english.subject).toBe(
      "Published on Mastodon (@alice@social.example)"
    );
    expect(english.text).toContain(
      "A post of Studio Nord is live on Mastodon (@alice@social.example)."
    );
    expect(english.text).toContain(`See the post: ${url}`);
  });

  it("tells a published post, in French", () => {
    const french = render(published, "fr");

    expect(french.subject).toBe("Publié sur Mastodon (@alice@social.example)");
    expect(french.text).toContain(`Voir la publication\u00A0: ${url}`);
    expect(french.html).toContain('<html lang="fr">');
  });

  it("says why a post failed, in each language", () => {
    const event: NoticeEvent = {
      _tag: "PostFailed",
      channel: mastodon,
      postId,
      reason: "tokenExpired",
    };

    expect(render(event, "en").text).toContain(
      "A post of Studio Nord did not go out on Mastodon (@alice@social.example): the account’s authorization stopped working. Reconnect it, then post again."
    );
    expect(render(event, "fr").text).toContain(
      "Une publication de Studio Nord n’est pas partie sur Mastodon (@alice@social.example)\u00A0: l’autorisation du compte ne fonctionne plus."
    );
  });

  it("says the post went out when only its first comment did not", () => {
    const event: NoticeEvent = {
      _tag: "PostFailed",
      channel: mastodon,
      notSent: "firstComment",
      postId,
      reason: "contentRejected",
    };

    const english = render(event, "en");
    const french = render(event, "fr");

    expect(english.subject).toBe(
      "A first comment did not go out on Mastodon (@alice@social.example)"
    );
    expect(english.text).toContain(
      "A post of Studio Nord is live on Mastodon (@alice@social.example), but its first comment did not go out:"
    );
    expect(french.text).toContain(
      "Une publication de Studio Nord est en ligne sur Mastodon (@alice@social.example), mais son premier commentaire n’est pas parti\u00A0:"
    );
  });

  it("says the post went out when only its later parts did not", () => {
    const event: NoticeEvent = {
      _tag: "PostFailed",
      channel: mastodon,
      notSent: "laterParts",
      postId,
      reason: "contentRejected",
    };

    expect(render(event, "en").text).toContain(
      "A post of Studio Nord is live on Mastodon (@alice@social.example), but the parts after its first did not go out:"
    );
    expect(render(event, "fr").text).toContain(
      "Une publication de Studio Nord est en ligne sur Mastodon (@alice@social.example), mais les parties après la première ne sont pas parties\u00A0:"
    );
  });

  // Nothing in Peal turns a channel back on, and reconnecting leaves it off:
  // a new channel for the account is what members can make.
  it("says what members can do with a channel turned off", () => {
    const event: NoticeEvent = {
      _tag: "PostFailed",
      channel: mastodon,
      postId,
      reason: "channelDisabled",
    };

    expect(render(event, "en").text).toContain(
      "its channel was turned off before it went out. Turn the channel back on, then schedule it in a new post."
    );
    expect(render(event, "fr").text).toContain(
      "son canal a été désactivé avant son départ. Réactivez le canal, puis programmez-la dans une nouvelle publication."
    );
  });

  it("words every failure in every language", () => {
    for (const reason of PostFailureReasonSchema.literals) {
      for (const locale of locales) {
        const email = render(
          { _tag: "PostFailed", channel: mastodon, postId, reason },
          locale
        );

        // Every placeholder is filled.
        expect(email.subject).not.toMatch(/\{\w+\}/u);
        expect(email.text).not.toMatch(/\{\w+\}/u);
      }
    }
  });

  it("asks to check the platform before reposting an unconfirmed post", () => {
    const event: NoticeEvent = {
      _tag: "PostUnconfirmed",
      channel: mastodon,
      postId,
    };

    const english = render(event, "en");
    const french = render(event, "fr");

    expect(english.subject).toBe(
      "Check Mastodon (@alice@social.example): a post may have gone out"
    );
    expect(english.text).toContain(
      "Check the platform before you post it again"
    );
    expect(french.subject).toBe(
      "Vérifiez Mastodon (@alice@social.example)\u00A0: une publication est peut-être partie"
    );
    expect(french.text).toContain(
      "Vérifiez sur la plateforme avant de la republier"
    );
  });

  it("names a channel disconnected since as such", () => {
    const event: NoticeEvent = {
      _tag: "PostUnconfirmed",
      channel: Option.none(),
      postId,
    };

    expect(render(event, "en").subject).toBe(
      "Check a disconnected channel: a post may have gone out"
    );
    expect(render(event, "fr").subject).toBe(
      "Vérifiez un canal déconnecté\u00A0: une publication est peut-être partie"
    );
  });

  it("escapes names in HTML and keeps them in the text", () => {
    const email = renderNoticeEmail({
      event: {
        _tag: "PostPublished",
        channel: Option.some({ handle: "@a<b>", platform: "x" }),
        permalink: Option.none(),
        postId,
      },
      locale: "en",
      url,
      workspaceName: 'Studio "Nord" & Co',
    });

    expect(email.html).toContain("X (@a&lt;b&gt;)");
    expect(email.html).toContain("Studio &quot;Nord&quot; &amp; Co");
    expect(email.html).not.toContain("<b>");
    expect(email.text).toContain('Studio "Nord" & Co');
  });
});
