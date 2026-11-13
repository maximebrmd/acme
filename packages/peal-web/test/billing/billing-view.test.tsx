import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import type { Billing, PlanAllowances } from "peal-contract";
import { rateCard } from "peal-contract/rate-card";
import { renderToStaticMarkup } from "react-dom/server";

import { BillingView } from "#components/billing/billing-view.tsx";
import type { BillingViewProps } from "#components/billing/billing-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const freeTier: PlanAllowances = {
  assistantRequests: 0,
  channels: 2,
  mediaStorage: 1_000_000_000,
  members: null,
  scheduledPosts: null,
};

const perAccount: PlanAllowances = {
  assistantRequests: 20,
  channels: 100,
  mediaStorage: 35_000_000_000,
  members: null,
  scheduledPosts: null,
};

const usage: Billing["usage"] = {
  assistantRequests: {
    resetsAt: DateTime.makeUnsafe("2026-11-14T00:00:00Z"),
    used: 2,
  },
  channels: 2,
  mediaStorage: 125_000_000,
  members: 4,
  scheduledPosts: {
    resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
    used: 12,
  },
};

const account: NonNullable<Billing["account"]> = {
  billingWorkspaceId: "studio",
  billingWorkspaceName: "Studio",
  id: "0190f3a0-0000-7000-8000-00000000b001",
  otherWorkspaces: [],
  partner: false,
  payer: true,
  transfer: null,
  workspaces: 1,
};

// A workspace that bills its account, on the free tier: two accounts,
// whose days cost nothing.
const onFree: Billing = {
  account,
  accounts: {
    accountDays: 26,
    connected: 2,
    estimate: { amount: 0, currency: "usd" },
    nextAccount: { amount: 500, currency: "usd" },
    pooled: 2,
  },
  allowances: freeTier,
  currency: "eur",
  enabled: true,
  estimate: { amount: 0, currency: "usd" },
  paymentMethod: false,
  plan: "free",
  plans: [
    { allowances: freeTier, plan: "free", price: null },
    { allowances: perAccount, plan: "payAsYouGo", price: null },
  ],
  rateCard,
  subscription: null,
  trial: { available: false, days: 14, plan: "pro" },
  upcomingInvoice: null,
  usage,
  vatRate: 20,
  withdrawableUntil: null,
};

// Seven accounts across three workspaces, paid for since the 9th.
const onPerAccount: Billing = {
  ...onFree,
  account: { ...account, workspaces: 3 },
  accounts: {
    accountDays: 91,
    connected: 4,
    estimate: { amount: 1517, currency: "usd" },
    nextAccount: { amount: 500, currency: "usd" },
    pooled: 7,
  },
  allowances: perAccount,
  estimate: { amount: 1517, currency: "usd" },
  paymentMethod: true,
  plan: "payAsYouGo",
  subscription: {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
    endsAt: null,
    interval: "month",
    plan: "payAsYouGo",
    startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
    status: "active",
    trialEnd: null,
  },
  upcomingInvoice: { amount: 2520, currency: "usd" },
  usage: { ...usage, channels: 7 },
  withdrawableUntil: DateTime.makeUnsafe("2026-11-23T10:00:00Z"),
};

// A partner's customer: the partner's home bills, and this workspace reads
// none of the account's money.
const customer: Billing = {
  ...onPerAccount,
  account: {
    ...account,
    billingWorkspaceId: "home",
    billingWorkspaceName: null,
    partner: true,
    payer: false,
    workspaces: 9,
  },
  accounts: {
    accountDays: null,
    connected: 3,
    estimate: null,
    nextAccount: null,
    pooled: 41,
  },
  estimate: null,
  subscription: null,
  upcomingInvoice: null,
  usage: { ...usage, channels: 41 },
  withdrawableUntil: null,
};

// A plan priced by tiers of channels, no longer sold.
const onStarter: Billing = {
  ...onFree,
  allowances: {
    assistantRequests: 10,
    channels: 5,
    mediaStorage: 5_000_000_000,
    members: 3,
    scheduledPosts: null,
  },
  plan: "starter",
  subscription: {
    cancelAtPeriodEnd: false,
    currentPeriodEnd: DateTime.makeUnsafe("2026-12-09T10:00:00Z"),
    endsAt: null,
    interval: "year",
    plan: "starter",
    startedAt: DateTime.makeUnsafe("2025-12-09T10:00:00Z"),
    status: "active",
    trialEnd: null,
  },
};

const unbilled: Billing = {
  accounts: {
    accountDays: null,
    connected: 3,
    estimate: null,
    nextAccount: null,
    pooled: 3,
  },
  allowances: {
    assistantRequests: null,
    channels: null,
    mediaStorage: null,
    members: null,
    scheduledPosts: null,
  },
  currency: "eur",
  enabled: false,
  estimate: null,
  paymentMethod: false,
  plan: null,
  plans: [],
  rateCard: null,
  subscription: null,
  trial: null,
  upcomingInvoice: null,
  usage: { ...usage, channels: 3 },
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
        pending={null}
        step={{ _tag: "idle" }}
        termsUrl="https://site.example.test/terms"
        onBack={ignore}
        onCancel={ignore}
        onConfirmCancel={ignore}
        onConfirmWithdrawal={ignore}
        onConsent={ignore}
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
  it("shows the free tier, the month's account-days and what they would cost, from the counts", async () => {
    const html = await render("en", { billing: onFree });

    expect(
      missing(html, [
        "Free tier",
        "Up to 2 connected accounts across the billing account, without a payment method.",
        "This month",
        "2 of 2",
        "26 account-days so far",
        "With a payment method, the month so far would cost $0.00, excluding tax.",
        "One more account, the 3rd, costs $5.00 a month, excluding tax.",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Stripe’s next invoice");
  });

  it("lists the ladder from the rate card, with the day rule and the currency's two sentences", async () => {
    const html = await render("en", { billing: onFree });

    expect(
      missing(html, [
        "Accounts 1 to 2",
        "Accounts 3 to 10",
        "Accounts 11 to 100",
        "From account 101",
        "$5.00",
        "$3.00",
        "$1.00",
        "Each UTC day counts the most accounts connected at once",
        "for days 1 to 30 of the month: the 31st is free",
        "VAT is added at checkout for customers in the EU, at their country’s rate.",
        "At checkout you can pay in your own currency, converted by our payment provider at the day’s rate; otherwise your card is charged in US dollars.",
      ])
    ).toStrictEqual([]);
    // No plan cards, no period to choose, no trial.
    expect(html).not.toContain("Billing period");
    expect(html).not.toContain("Yearly");
    expect(html).not.toContain("free trial");
    expect(html).not.toContain("Starter");
  });

  it("asks a member who manages billing for a payment method, behind the unticked box and the button the law words", async () => {
    const html = await render("en", { billing: onFree });

    expect(
      missing(html, [
        "Add a payment method",
        "connects more than 2 accounts",
        "I ask Peal to start per-account pricing now",
        'href="https://site.example.test/terms"',
        "Order with obligation to pay",
        "Tick the box above to add a payment method.",
        "Payment is by card, on Stripe’s checkout",
      ])
    ).toStrictEqual([]);
    expect(html).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation to pay/u
    );

    const ticked = await render("en", { billing: onFree, consented: true });

    expect(ticked).not.toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation to pay/u
    );
  });

  it("leaves the order to owners and admins", async () => {
    const html = await render("en", { billing: onFree, canManage: false });

    expect(html).not.toContain("Order with obligation to pay");
    expect(html).not.toContain("I ask Peal");
    expect(html).toContain(
      "Owners and admins of the workspace add its payment method."
    );
  });

  it("shows per-account pricing's month, with Stripe's next invoice, and the portal instead of the order", async () => {
    const html = await render("en", { billing: onPerAccount });

    expect(
      missing(html, [
        "Per-account pricing",
        "Active",
        "7 accounts across the account’s 3 workspaces, 4 of them on this one.",
        "91 account-days so far",
        "So far this month: $15.17, excluding tax.",
        "Stripe’s next invoice: $25.20, tax included. The invoice is the one that counts.",
        "Manage billing",
        "Cancel your contract",
        "Withdraw from contract here",
        "Next invoice on December 1, 2026, for the month’s use",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Order with obligation to pay");
    expect(html).not.toContain("I ask Peal");
  });

  it("shows a partner's customer only its own accounts, and none of the account's money", async () => {
    const html = await render("en", { billing: customer });

    expect(
      missing(html, [
        "3 accounts connected on this workspace.",
        "The workspace that bills the account shows the month’s account-days and their cost to its members.",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("41");
    expect(html).not.toContain("account-days so far");
    expect(html).not.toContain("So far this month");
    expect(html).not.toContain("Order with obligation to pay");
  });

  it("reads a legacy plan as it is, with its period's end, and sells nothing more on it", async () => {
    const html = await render("en", { billing: onStarter });

    expect(
      missing(html, [
        "Starter",
        "priced by tiers of channels, no longer sold",
        "Renews on December 9, 2026, each year until cancelled",
        "Cancel your contract",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Order with obligation to pay");
  });

  it("asks to confirm a cancellation in the law's words, then says when it ends", async () => {
    const asking = await render("fr", {
      billing: onPerAccount,
      step: { _tag: "confirmCancel" },
    });

    expect(
      missing(asking, [
        "Résilier votre contrat",
        "Le tarif par compte prend fin le 1 décembre 2026",
        "Notification de la résiliation",
        "Garder l’abonnement",
      ])
    ).toStrictEqual([]);

    const done = await render("en", {
      billing: onPerAccount,
      step: {
        _tag: "cancelled",
        endsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
      },
    });

    expect(done).toContain("It ends on December 1, 2026.");
  });

  it("says a withdrawal from per-account pricing invoices the use so far, and acknowledges it", async () => {
    const asking = await render("en", {
      billing: onPerAccount,
      step: {
        _tag: "confirmWithdrawal",
        preview: {
          endsAt: DateTime.makeUnsafe("2026-11-23T10:00:00Z"),
          plan: "payAsYouGo",
          refund: { amount: 0, currency: "usd" },
          startedAt: DateTime.makeUnsafe("2026-11-09T10:00:00Z"),
        },
      },
    });

    expect(
      missing(asking, [
        "Withdraw from the contract",
        "You ordered per-account pricing on November 9, 2026.",
        "what was used since then is invoiced at once",
        "Confirm withdrawal",
      ])
    ).toStrictEqual([]);

    const legacy = await render("fr", {
      billing: onStarter,
      step: {
        _tag: "confirmWithdrawal",
        preview: {
          endsAt: DateTime.makeUnsafe("2025-12-23T10:00:00Z"),
          plan: "starter",
          refund: { amount: 810, currency: "eur" },
          startedAt: DateTime.makeUnsafe("2025-12-09T10:00:00Z"),
        },
      },
    });

    expect(legacy).toContain("8,10 € vous est remboursé");
  });

  it("offers to cancel and, within 14 days, to withdraw, in French", async () => {
    const html = await render("fr", { billing: onPerAccount });

    expect(
      missing(html, [
        "Tarif par compte",
        "Résilier votre contrat",
        "Renoncer au contrat ici",
        "Jusqu’au 23 novembre 2026",
        "Prochaine facture le 1 décembre 2026",
        "15,17 $US",
      ])
    ).toStrictEqual([]);
  });

  it("says when nothing is limited, on a server that does not bill", async () => {
    const html = await render("en", { billing: unbilled });

    expect(html).toContain("Nothing is limited");
    expect(html).toContain("3, no limit");
    expect(html).toContain("125 MB, no limit");
    expect(html).not.toContain("Order");
    expect(html).not.toContain("account-days");
  });

  it("thanks the person back from checkout, and explains a refusal", async () => {
    const html = await render("en", {
      billing: onFree,
      checkedOut: true,
      error: "billedElsewhere",
    });

    expect(html).toContain(
      "per-account pricing starts as soon as Stripe confirms"
    );
    expect(html).toContain("Another workspace bills this billing account");
  });

  it("keeps the invoices of past contracts within reach once one has ended", async () => {
    const html = await render("en", { billing: onFree });

    expect(html).toContain(">Invoices and receipts</button>");
    await expect(
      render("en", { billing: onFree, canManage: false })
    ).resolves.not.toContain("Invoices and receipts");
  });
});
