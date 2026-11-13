import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
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
        "The 3rd costs $5.00 a month, excluding tax ($6.00 with 20% VAT), counted by the day; the first 2 stay free.",
        "VAT is added at checkout for customers in the EU",
        "At checkout you can pay in your own currency",
      ])
    ).toStrictEqual([]);
    expect(english).not.toContain("Billing period");
    expect(english).not.toContain("€");

    // The eleventh account falls in the next band.
    const eleventh = await render("en", {
      reason: { ...third, allowed: 10, used: 10 },
    });

    expect(eleventh).toContain("The 11th costs $3.00 a month");

    const french = await render("fr");

    expect(
      missing(french, [
        "Le 3e coûte 5,00 $US HT par mois (6,00 $US avec la TVA de 20 %)",
        "Au paiement, vous pouvez payer dans votre devise",
      ])
    ).toStrictEqual([]);
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
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation/u
    );
    expect(unticked).not.toContain('aria-checked="true"');

    const ticked = await render("en", { consented: true });

    expect(ticked).not.toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation/u
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
});
