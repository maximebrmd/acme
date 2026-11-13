import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import type { Billing, PlanAllowances } from "peal-contract";
import { accountsCharge, rateCard } from "peal-contract/rate-card";
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
    estimate: { amount: accountsCharge(91), currency: "usd" },
    nextAccount: { amount: 500, currency: "usd" },
    pooled: 7,
  },
  allowances: perAccount,
  estimate: { amount: accountsCharge(91), currency: "usd" },
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
  // As the server answers a workspace that does not bill its account: the
  // pool's counts and limits, as its usage tells them, and no money or
  // contract.
  allowances: { ...perAccount, mediaStorage: 205_000_000_000 },
  estimate: null,
  paymentFailed: false,
  subscription: null,
  upcomingInvoice: null,
  usage: { ...usage, channels: 41, mediaStorage: 35_000_000_000 },
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
        "With a payment method, the month so far would cost $0.00 excl. VAT · $0.00 with France’s 20% VAT.",
        "One more account, the 3rd, costs a month: $5.00 excl. VAT · $6.00 with France’s 20% VAT.",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Stripe’s next invoice");
  });

  it("says the next account is free while the free accounts are not all taken", async () => {
    const html = await render("en", {
      billing: {
        ...onFree,
        accounts: { ...onFree.accounts, connected: 1, pooled: 1 },
      },
    });

    expect(html).toContain(
      "One more account, the 2nd, is free: the first 2 are."
    );
    expect(html).not.toContain("costs $0.00");
  });

  it("lists the ladder from the rate card, with the day rule and the currency's two sentences", async () => {
    const html = await render("en", { billing: onFree });

    expect(
      missing(html, [
        "Accounts 1 to 2",
        "Accounts 3 to 10",
        "Accounts 11 to 100",
        "From account 101",
        "Each, a month, excl. VAT",
        "With France’s 20% VAT",
        "$5.00",
        "$6.00",
        "$3.00",
        "$3.60",
        "$1.00",
        "$1.20",
        "The VAT you pay depends on your country: it is added at checkout for customers in the EU, at their country’s rate. A business with a valid VAT number pays the price excluding VAT, the VAT being reverse-charged; in France, French VAT applies.",
        "Each UTC day counts the most accounts connected at once",
        "for days 1 to 30 of the month: the 31st is free",
        "it is added at checkout for customers in the EU, at their country’s rate.",
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
      /<button[^>]*aria-disabled="true"[^>]*>(?:<span[^>]*>)?Order with obligation to pay/u
    );

    const ticked = await render("en", { billing: onFree, consented: true });

    expect(ticked).not.toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>(?:<span[^>]*>)?Order with obligation to pay/u
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
        "So far this month: $5.17 excl. VAT · $6.20 with France’s 20% VAT.",
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

  it("shows a partner's customer the pool's counts and limits, and none of the account's money or contract", async () => {
    const html = await render("en", { billing: customer });

    expect(
      missing(html, [
        "41 accounts across the account’s 9 workspaces, 3 of them on this one.",
        "The workspace that bills the account shows the month’s account-days and their cost to its members.",
        "35 GB of 205 GB",
      ])
    ).toStrictEqual([]);
    // Who pays and where is the account card's; this one names no plan,
    // no contract and no pooled limit.
    expect(
      [
        "Your plan",
        "MB, no limit",
        "Cancel your contract",
        "account-days so far",
        "So far this month",
        "Order with obligation to pay",
      ].filter((text) => html.includes(text))
    ).toStrictEqual([]);
  });

  it("sends an unpaid contract to the portal, never to an order", async () => {
    const html = await render("en", {
      billing: { ...onFree, paymentFailed: true },
    });

    expect(
      missing(html, [
        "The last payments for per-account pricing did not go through",
        "Update the payment method",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Order with obligation to pay");
  });

  it("says a past due payment once, with the portal, and keeps the plan", async () => {
    const html = await render("en", {
      billing: {
        ...onPerAccount,
        paymentFailed: true,
        subscription:
          onPerAccount.subscription === null
            ? null
            : { ...onPerAccount.subscription, status: "past_due" },
      },
    });

    expect(html).toContain("The last payment did not go through.");
    expect(html).not.toContain("back on the free tier");
    expect(html).toContain("Manage billing");
  });

  it("offers the portal beside a refusal that says a contract already exists", async () => {
    const html = await render("en", {
      billing: onFree,
      error: "alreadySubscribed",
    });

    expect(html).toContain(">Update the payment method</button>");
  });

  it("says when staff took the free tier away, never that 2 accounts are free", async () => {
    const html = await render("en", {
      billing: {
        ...onFree,
        accounts: { ...onFree.accounts, connected: 0, pooled: 0 },
        allowances: { ...freeTier, channels: 0 },
      },
    });

    expect(html).toContain(
      "This billing account connects no account without a payment method."
    );
    expect(html).not.toContain("Up to 2 connected accounts");
    expect(html).not.toContain("is free: the first");
  });

  it("names the error it was refused with, not a payment provider that never answered", async () => {
    await expect(
      render("en", { billing: onFree, error: "unknown" })
    ).resolves.toContain("That did not work. Try again in a moment.");
    await expect(
      render("fr", { billing: onFree, error: "planNotSold" })
    ).resolves.toContain("Cette offre n’est plus vendue");
  });

  it("reads a legacy plan as it is, with its period's end, and sells nothing more on it", async () => {
    const html = await render("en", { billing: onStarter });

    expect(
      missing(html, [
        "Starter",
        "priced by tiers of channels, no longer sold",
        "Renews on December 9, 2026, each year until cancelled",
        "Cancel your contract",
        "Connected channels",
        "2 of 5",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Order with obligation to pay");
    // It has a payment method, and its plan is not priced by the day.
    expect(html).not.toContain("With a payment method, the month so far");
    expect(html).not.toContain("account-days so far");
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
        "5,17 $US HT · 6,20 $US avec la TVA française de 20 %",
        "La TVA que vous payez dépend de votre pays",
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
