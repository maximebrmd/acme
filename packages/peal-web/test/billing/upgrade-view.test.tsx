import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { rateCard } from "peal-contract/rate-card";
import { renderToStaticMarkup } from "react-dom/server";

import type { UpgradeReason } from "#billing/upgrade.ts";
import { UpgradeView } from "#components/billing/upgrade-view.tsx";
import type { UpgradeViewProps } from "#components/billing/upgrade-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const nothing = () => {
  // Rendered once: nothing is clicked.
};

// The free tier's third account, refused.
const third: UpgradeReason = {
  allowed: 2,
  limit: "channels",
  plan: "free",
  planWithRoom: "payAsYouGo",
  used: 2,
};

// Per-account pricing before a first invoice is paid: no plan holds more.
const ceiling: UpgradeReason = {
  allowed: 100,
  limit: "channels",
  plan: "payAsYouGo",
  planWithRoom: null,
  used: 100,
};

const render = async (
  locale: "en" | "fr",
  props: Partial<UpgradeViewProps> = {}
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <UpgradeView
        canManage
        card={rateCard}
        consented={false}
        contactUrl={null}
        elsewhere={null}
        error={null}
        managers={[]}
        ordering={false}
        reason={third}
        termsUrl={null}
        trialing={false}
        workspaceName="Studio Nord"
        onConsent={nothing}
        onOrder={nothing}
        {...props}
      />
    </NextIntlClientProvider>
  );
};

// What a page does not say that it should.
const missing = (html: string, texts: readonly string[]) =>
  texts.filter((text) => !html.includes(text));

describe(UpgradeView, () => {
  it("says the free tier's accounts are taken, across the billing account", async () => {
    const html = await render("en");

    expect(
      missing(html, [
        "The billing account of Studio Nord is on the free tier, which connects 2 accounts across its workspaces, and it has 2.",
        "Or disconnect a channel to make room.",
      ])
    ).toStrictEqual([]);
  });

  it("prices the next account from the rate card, with and without VAT, in dollars", async () => {
    const english = await render("en");

    expect(
      missing(english, [
        "With a payment method, the billing account connects more accounts.",
        "The 3rd costs a month, counted by the day: $5.00 excl. VAT · $6.00 with France’s 20% VAT; the first 2 stay free.",
        "A business with a valid VAT number pays the price excluding VAT, the VAT being reverse-charged; in France, French VAT applies.",
        "it is added at checkout for customers in the EU",
        "At checkout you can pay in your own currency",
      ])
    ).toStrictEqual([]);
    expect(english).not.toContain("Billing period");
    expect(english).not.toContain("€");

    // The eleventh account falls in the next band.
    const eleventh = await render("en", {
      reason: { ...third, allowed: 10, used: 10 },
    });

    expect(eleventh).toContain("The 11th adds a month: $3.00");

    const french = await render("fr");

    expect(
      missing(french, [
        "Le 3e coûte par mois, compté au jour : 5,00 $US HT · 6,00 $US avec la TVA française de 20 %",
        "Au paiement, vous pouvez payer dans votre devise",
      ])
    ).toStrictEqual([]);
  });

  it("quotes what the order bills for the accounts held, then the next one, from the ladder", async () => {
    const html = await render("en", {
      reason: { ...third, used: 8 },
    });

    expect(
      missing(html, [
        "The 8 accounts connected cost a month, counted by the day: $30.00 excl. VAT · $36.00 with France’s 20% VAT.",
        "The 9th adds a month: $5.00 excl. VAT · $6.00 with France’s 20% VAT.",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("The 9th costs");
  });

  it("says a free next account is free, never $0.00", async () => {
    const html = await render("en", { reason: { ...third, used: 1 } });

    expect(html).toContain("The 2nd is free: the first 2 are.");
    expect(html).not.toContain("$0.00");
  });

  it("prices from the rate card the server answered", async () => {
    const card = {
      ...rateCard,
      prices: {
        usd: {
          ...rateCard.prices.usd,
          accounts: {
            bands: [
              { monthly: 0, upTo: 2 },
              { monthly: 700, upTo: null },
            ],
          },
        },
      },
    };

    await expect(render("en", { card })).resolves.toContain(
      "The 3rd costs a month, counted by the day: $7.00"
    );
  });

  it("says when staff took the free tier away", async () => {
    const html = await render("en", {
      reason: { ...third, allowed: 0, used: 0 },
    });

    expect(html).toContain(
      "The billing account of Studio Nord connects no account without a payment method."
    );
  });

  it("asks for more without a deadline where none applies", async () => {
    const html = await render("en", {
      reason: {
        allowed: 35_000_000_000,
        limit: "mediaStorage",
        plan: "payAsYouGo",
        planWithRoom: null,
        used: 35_000_000_000,
      },
    });

    expect(html).toContain(
      "For more, write to the people who run this server."
    );
    expect(html).not.toContain("before then");
  });

  it("asks for a card behind the unticked box, with the button the law words", async () => {
    const unticked = await render("en");

    expect(
      missing(unticked, [
        "I ask Peal to start per-account pricing now",
        "Order with obligation to pay",
        "Payment is by card, on Stripe’s checkout",
      ])
    ).toStrictEqual([]);
    expect(unticked).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>(?:<span[^>]*>)?Order with obligation/u
    );
    expect(unticked).not.toContain('aria-checked="true"');

    const ticked = await render("en", { consented: true });

    expect(ticked).not.toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>(?:<span[^>]*>)?Order with obligation/u
    );
    await expect(render("fr")).resolves.toContain(
      "Commander avec obligation de paiement"
    );
  });

  it("names the workspace that bills the account, and orders nothing here", async () => {
    const html = await render("en", {
      elsewhere: { link: <a href="#studio">Studio Sud</a> },
    });

    expect(html).toContain(
      'The billing account of Studio Nord is billed on <a href="#studio">Studio Sud</a>: its owners and admins add the payment method there.'
    );
    expect(html).not.toContain("Order with obligation to pay");

    const unnamed = await render("fr", { elsewhere: { link: null } });

    expect(unnamed).toContain(
      "Le compte de facturation de Studio Nord est facturé sur un autre de ses espaces de travail"
    );
  });

  it("says the ceiling before a first paid invoice, and how to ask for more", async () => {
    const operator = await render("en", { reason: ceiling });

    const hosted = await render("en", {
      contactUrl: "mailto:hello@example.test",
      reason: ceiling,
    });

    expect(operator).toContain(
      "Until its first invoice is paid, the billing account of Studio Nord connects up to 100 accounts, and it has 100."
    );
    expect(operator).toContain(
      "For more before then, write to the people who run this server."
    );
    expect(operator).not.toContain("Order with obligation to pay");
    expect(hosted).toContain('href="mailto:hello@example.test"');
  });

  it("names who can add a payment method to a member who cannot", async () => {
    const html = await render("en", {
      canManage: false,
      managers: ["Ana Example", "Sam Example"],
    });

    const unnamed = await render("en", { canManage: false });

    expect(html).toContain(
      "Owners and admins of Studio Nord add its payment method: Ana Example, Sam Example."
    );
    expect(html).not.toContain("Order with obligation to pay");
    expect(unnamed).toContain(
      "An owner or an admin of the workspace adds its payment method: ask one of them."
    );
  });

  it("writes the free tier's storage, and what a payment method gives", async () => {
    const html = await render("en", {
      reason: {
        allowed: 1_000_000_000,
        limit: "mediaStorage",
        plan: "free",
        planWithRoom: "payAsYouGo",
        used: 980_000_000,
      },
    });

    expect(
      missing(html, [
        "The billing account of Studio Nord stores 980 MB of media, uploads in progress included, and the free tier holds 1 GB.",
        "With a payment method, media storage is 5 GB per connected account, 5 GB at least.",
      ])
    ).toStrictEqual([]);
  });

  it("tells a legacy plan's member that moving gives no credit yet", async () => {
    const html = await render("en", {
      reason: { ...third, allowed: 5, plan: "starter", used: 5 },
    });

    expect(html).toContain("The Starter plan of Studio Nord allows 5 channels");
    expect(html).toContain(
      "Moving gives no credit for its unused time yet: it stays paid until its period ends"
    );
  });

  it("says a trial's order starts per-account pricing", async () => {
    const html = await render("en", { trialing: true });

    expect(html).toContain(
      "Studio Nord is in its trial: ordering starts per-account pricing"
    );
  });

  it("asks for a payment method before an X account, at X's rates up to the ceiling, never a count of units", async () => {
    const reason: UpgradeReason = {
      allowed: 0,
      kind: "meter",
      meter: "xApi",
      plan: "free",
      planWithRoom: "payAsYouGo",
      resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
      used: 0,
    };

    const english = await render("en", { reason });

    expect(
      missing(english, [
        "X’s API is billed at X’s own rates",
        "with nothing added",
        "$25.00",
      ])
    ).toStrictEqual([]);
    expect(english).not.toContain("units");

    const french = await render("fr", { reason });

    expect(
      missing(french, ["aux tarifs de X", "sans rien ajouter"])
    ).toStrictEqual([]);
  });
});
