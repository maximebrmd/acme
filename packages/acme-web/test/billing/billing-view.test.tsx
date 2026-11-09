import { describe, expect, it } from "@effect/vitest";
import type { Billing, PlanAllowances } from "acme-contract";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { BillingView } from "#components/billing/billing-view.tsx";
import type { BillingViewProps } from "#components/billing/billing-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const free: PlanAllowances = {
  assistantRequests: 10,
  channels: 3,
  members: 2,
  scheduledPosts: 30,
};

const business: PlanAllowances = {
  assistantRequests: 500,
  channels: 30,
  members: 20,
  scheduledPosts: null,
};

const usage: Billing["usage"] = {
  assistantRequests: {
    resetsAt: DateTime.makeUnsafe("2026-11-10T00:00:00Z"),
    used: 4,
  },
  channels: 3,
  members: 1,
  scheduledPosts: {
    resetsAt: DateTime.makeUnsafe("2026-12-01T00:00:00Z"),
    used: 12,
  },
};

const onFree: Billing = {
  allowances: free,
  enabled: true,
  plan: "free",
  plans: [
    { allowances: free, plan: "free" },
    {
      allowances: {
        assistantRequests: 100,
        channels: 10,
        members: 5,
        scheduledPosts: 300,
      },
      plan: "pro",
    },
    { allowances: business, plan: "business" },
  ],
  subscription: null,
  usage,
};

const unbilled: Billing = {
  allowances: {
    assistantRequests: null,
    channels: null,
    members: null,
    scheduledPosts: null,
  },
  enabled: false,
  plan: null,
  plans: [],
  subscription: null,
  usage,
};

const ignore = () => {
  // The view only renders.
};

// What a page says that it should not, or does not say that it should.
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
        error={null}
        pending={null}
        onChoose={ignore}
        onManage={ignore}
        onRefresh={ignore}
        {...props}
      />
    </NextIntlClientProvider>
  );
};

describe(BillingView, () => {
  it("shows the free plan's usage against its limits, and the plans to move to", async () => {
    const html = await render("en", { billing: onFree });

    expect(
      missing(html, [
        "The workspace has no subscription.",
        "3 of 3",
        "12 of 30",
        "Starts again on Dec 1, 2026",
        "Move to Pro",
        "Move to Business",
        "Unlimited posts",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Manage billing");
  });

  it("shows a subscription's state, and the portal to those who manage it", async () => {
    const html = await render("fr", {
      billing: {
        ...onFree,
        allowances: business,
        plan: "business",
        subscription: {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: DateTime.makeUnsafe("2026-12-09T10:00:00Z"),
          plan: "business",
          status: "past_due",
        },
      },
    });

    expect(
      missing(html, [
        "Paiement en retard",
        "Prend fin le 9 décembre 2026",
        "Le dernier paiement n’est pas passé.",
        "Gérer la facturation",
        "12, sans limite",
      ])
    ).toStrictEqual([]);
    expect(html).not.toContain("Passer à");
  });

  it("leaves plan changes to owners and admins", async () => {
    const html = await render("en", { billing: onFree, canManage: false });

    expect(html).not.toContain("Move to Pro");
    expect(html).toContain(
      "Owners and admins of the workspace change its plan."
    );
  });

  it("says when nothing is limited, on a server that does not bill", async () => {
    const html = await render("en", { billing: unbilled });

    expect(html).toContain("Nothing is limited");
    expect(html).toContain("3, no limit");
    expect(html).not.toContain("Move to");
  });

  it("thanks the person back from checkout, and explains a refusal", async () => {
    const html = await render("en", {
      billing: onFree,
      checkedOut: true,
      error: "forbidden",
    });

    expect(html).toContain("The plan changes as soon as Stripe confirms");
    expect(html).toContain("Only owners and admins of the workspace");
  });
});
