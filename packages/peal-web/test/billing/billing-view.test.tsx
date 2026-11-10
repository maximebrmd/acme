import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import type { Billing, PlanAllowances } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { BillingView } from "#components/billing/billing-view.tsx";
import type { BillingViewProps } from "#components/billing/billing-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const free: PlanAllowances = {
  assistantRequests: 3,
  channels: 3,
  mediaStorage: 500_000_000,
  members: 2,
  scheduledPosts: 30,
};

const starter: PlanAllowances = {
  assistantRequests: 10,
  channels: 5,
  mediaStorage: 5_000_000_000,
  members: 3,
  scheduledPosts: null,
};

const business: PlanAllowances = {
  assistantRequests: 40,
  channels: 30,
  mediaStorage: 75_000_000_000,
  members: null,
  scheduledPosts: null,
};

const usage: Billing["usage"] = {
  assistantRequests: {
    resetsAt: DateTime.makeUnsafe("2026-11-10T00:00:00Z"),
    used: 2,
  },
  channels: 3,
  mediaStorage: 125_000_000,
  members: 1,
  scheduledPosts: {
    resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
    used: 12,
  },
};

const onFree: Billing = {
  allowances: free,
  currency: "eur",
  enabled: true,
  plan: "free",
  plans: [
    { allowances: free, plan: "free", price: null },
    { allowances: starter, plan: "starter", price: { month: 750, year: 7500 } },
    {
      allowances: business,
      plan: "business",
      price: { month: 2500, year: 25_000 },
    },
  ],
  subscription: null,
  trial: { available: true, days: 14, plan: "pro" },
  usage,
  vatRate: 20,
  withdrawableUntil: null,
};

const onStarter: Billing = {
  ...onFree,
  allowances: starter,
  plan: "starter",
  subscription: {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: DateTime.makeUnsafe("2026-12-09T10:00:00Z"),
    interval: "month",
    plan: "starter",
    startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
    status: "active",
    trialEnd: null,
  },
  trial: { available: false, days: 14, plan: "pro" },
  withdrawableUntil: DateTime.makeUnsafe("2026-11-23T10:00:00Z"),
};

const unbilled: Billing = {
  allowances: {
    assistantRequests: null,
    channels: null,
    mediaStorage: null,
    members: null,
    scheduledPosts: null,
  },
  currency: "eur",
  enabled: false,
  plan: null,
  plans: [],
  subscription: null,
  trial: null,
  usage,
  vatRate: 20,
  withdrawableUntil: null,
};

const ignore = () => {
  // The view only renders.
};

// What a page does not say that it should.
const missing = (html: string, texts: readonly string[]) =>
  texts.filter((text) => !html.includes(text));

const render = async (
  locale: Locale,
  props: Partial<BillingViewProps> & Pick<BillingViewProps, "billing">
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <BillingView
        canManage
        checkedOut={false}
        consented={false}
        error={null}
        interval="month"
        pending={null}
        step={{ _tag: "idle" }}
        termsUrl="https://site.example.test/terms"
        onBack={ignore}
        onCancel={ignore}
        onConfirmCancel={ignore}
        onConfirmWithdrawal={ignore}
        onConsent={ignore}
        onInterval={ignore}
        onManage={ignore}
        onOrder={ignore}
        onRefresh={ignore}
        onWithdraw={ignore}
        {...props}
      />
    </NextIntlClientProvider>
  );
};

describe(BillingView, () => {
  it("shows prices with VAT first, the box to tick, and the order and trial buttons", async () => {
    const html = await render("en", { billing: onFree });

    expect(
      missing(html, [
        "€9.00 a month, VAT incl.",
        "€7.50 excl. VAT",
        "€1.80 per channel a month",
        "Prices include 20% VAT",
        "I ask Peal to start my subscription now.",
        'href="https://site.example.test/terms"',
        "Order with obligation to pay",
        "Try Pro free for 14 days",
        "Start the free trial",
        "Tick the box above",
        "5 GB of media",
        "125 MB of 500 MB",
        "12 of 30",
      ])
    ).toStrictEqual([]);
    // Nothing is ordered before the box is ticked.
    expect(html).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation to pay/u
    );
  });

  it("prices a year as its own, with what it comes to a month", async () => {
    const html = await render("en", {
      billing: onFree,
      consented: true,
      interval: "year",
    });

    expect(
      missing(html, [
        "€90.00 a year, VAT incl.",
        "€75.00 excl. VAT",
        "That is €7.50 a month",
        "you are reminded 45 days before",
      ])
    ).toStrictEqual([]);
    expect(html).not.toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation to pay/u
    );
  });

  it("offers to cancel and, within 14 days, to withdraw, in French", async () => {
    const html = await render("fr", { billing: onStarter });

    expect(
      missing(html, [
        "Commander avec obligation de paiement",
        "9,00\u00A0€ TTC par mois",
        "7,50\u00A0€ HT",
        "Résilier votre contrat",
        "Renoncer au contrat ici",
        "Jusqu’au 23 novembre 2026",
        "Renouvelé le 9 décembre 2026, chaque mois",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Commencer l’essai gratuit");
  });

  it("asks to confirm a cancellation, then says when it ends", async () => {
    const asking = await render("fr", {
      billing: onStarter,
      step: { _tag: "confirmCancel" },
    });

    expect(
      missing(asking, [
        "L’abonnement Starter prend fin le 9 décembre 2026",
        "Notification de la résiliation",
        "Garder l’abonnement",
      ])
    ).toStrictEqual([]);

    const done = await render("en", {
      billing: onStarter,
      step: {
        _tag: "cancelled",
        endsAt: DateTime.makeUnsafe("2026-12-09T10:00:00Z"),
      },
    });

    expect(done).toContain("It ends on December 9, 2026.");
  });

  it("asks to confirm a withdrawal with its refund, then acknowledges it", async () => {
    const asking = await render("en", {
      billing: onStarter,
      step: {
        _tag: "confirmWithdrawal",
        preview: {
          endsAt: DateTime.makeUnsafe("2026-11-23T10:00:00Z"),
          plan: "starter",
          refund: { amount: 810, currency: "eur" },
          startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
        },
      },
    });

    expect(
      missing(asking, [
        "Withdraw from the contract",
        "You subscribed to Starter on November 9, 2026.",
        "€8.10 is refunded",
        "Confirm withdrawal",
      ])
    ).toStrictEqual([]);

    const done = await render("fr", {
      billing: onStarter,
      step: { _tag: "withdrawn", refunded: { amount: 810, currency: "eur" } },
    });

    expect(done).toContain("Rétractation reçue");
    expect(done).toContain("8,10\u00A0€ vous est remboursé");
  });

  it("leaves orders to owners and admins", async () => {
    const html = await render("en", { billing: onFree, canManage: false });

    expect(html).not.toContain("Order with obligation to pay");
    expect(html).not.toContain("I ask Peal");
    expect(html).toContain(
      "Owners and admins of the workspace order and cancel its plan."
    );
  });

  it("says when nothing is limited, on a server that does not bill", async () => {
    const html = await render("en", { billing: unbilled });

    expect(html).toContain("Nothing is limited");
    expect(html).toContain("3, no limit");
    expect(html).toContain("125 MB, no limit");
    expect(html).not.toContain("Order");
  });

  it("thanks the person back from checkout, and explains a refusal", async () => {
    const html = await render("en", {
      billing: onFree,
      checkedOut: true,
      error: "trialUsed",
    });

    expect(html).toContain("The plan changes as soon as Stripe confirms");
    expect(html).toContain("already had its trial");
  });

  it("keeps the invoices of past plans within reach once the plan has ended", async () => {
    const html = await render("en", { billing: onFree });

    expect(html).toContain(">Invoices and receipts</button>");
    await expect(
      render("en", { billing: onFree, canManage: false })
    ).resolves.not.toContain("Invoices and receipts");
  });
});
