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

const channels: UpgradeReason = {
  allowed: 3,
  limit: "channels",
  plan: "free",
  planWithRoom: "starter",
  used: 3,
};

const largest: UpgradeReason = {
  allowed: 100,
  limit: "channels",
  plan: "agency",
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
        error={null}
        interval="month"
        managers={[]}
        ordering={false}
        reason={channels}
        termsUrl={null}
        tooSmall={null}
        trialing={false}
        workspaceName="Studio Nord"
        onConsent={nothing}
        onInterval={nothing}
        onOrder={nothing}
        {...props}
      />
    </NextIntlClientProvider>
  );
};

describe(UpgradeView, () => {
  it("says which limit was reached, with the usage and the plan", async () => {
    const html = await render("en");

    expect(html).toContain(
      "The Free plan of Studio Nord allows 3 channels, and it has 3."
    );
    expect(html).toContain("Or disconnect a channel to make room.");
  });

  it("offers the plan with room, its price with VAT first, then without", async () => {
    const html = await render("en");

    expect(html).toContain("The Starter plan has room:");
    expect(html).toContain("5 channels");
    expect(html.indexOf("€9.00 a month, VAT incl.")).toBeGreaterThan(-1);
    expect(html.indexOf("€7.50 excl. VAT")).toBeGreaterThan(
      html.indexOf("€9.00 a month, VAT incl.")
    );
  });

  it("prices a year as its own price", async () => {
    const yearly = await render("fr", { interval: "year" });

    expect(yearly).toContain("90,00\u00A0€ TTC par an");
    expect(yearly).toContain("75,00\u00A0€ HT");
  });

  it("orders with the words of an obligation to pay, and a request to start that is not ticked", async () => {
    const unticked = await render("en");

    expect(unticked).toContain("Order with obligation to pay");
    expect(unticked).toContain("I ask Peal to start my subscription now.");
    expect(unticked).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation/u
    );
    expect(unticked).not.toContain('aria-checked="true"');
  });

  it("lets the order go once the request to start is ticked, in each language", async () => {
    const ticked = await render("en", { consented: true });
    const french = await render("fr");

    expect(ticked).not.toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Order with obligation/u
    );
    expect(french).toContain("Commander avec obligation de paiement");
  });

  it("says a trial's order starts the paid plan", async () => {
    const html = await render("en", { trialing: true });

    expect(html).toContain(
      "Studio Nord is in its trial: ordering starts the paid plan"
    );
  });

  it("says how to ask for more on the largest plan", async () => {
    const operator = await render("en", { reason: largest });

    const hosted = await render("en", {
      contactUrl: "mailto:hello@example.test",
      reason: largest,
    });

    expect(operator).toContain(
      "Studio Nord is on the largest plan. For more, write to the people who run this server."
    );
    expect(operator).not.toContain("Order with obligation to pay");
    expect(hosted).toContain('href="mailto:hello@example.test"');
    expect(hosted).toContain("we make an offer for larger needs");
  });

  it("names who can upgrade to a member who cannot", async () => {
    const html = await render("en", {
      canManage: false,
      managers: ["Ana Example", "Sam Example"],
    });

    const unnamed = await render("en", { canManage: false });

    expect(html).toContain(
      "Owners and admins of Studio Nord order its plan: Ana Example, Sam Example."
    );
    expect(html).not.toContain("Order with obligation to pay");
    expect(unnamed).toContain(
      "An owner or an admin of the workspace orders its plan: ask one of them."
    );
  });

  it("writes storage in the units plans are sold in", async () => {
    const html = await render("en", {
      reason: {
        allowed: 500_000_000,
        limit: "mediaStorage",
        plan: "free",
        planWithRoom: "starter",
        used: 480_000_000,
      },
    });

    expect(html).toContain(
      "The Free plan of Studio Nord allows 500 MB of media, and it stores 480 MB"
    );
    expect(html).toContain("5 GB of media");
  });

  it("lists what to remove before a plan too small", async () => {
    const html = await render("en", {
      tooSmall: [
        { allowed: 5, limit: "channels", used: 8 },
        { allowed: 5_000_000_000, limit: "mediaStorage", used: 7_000_000_000 },
      ],
    });

    expect(html).toContain("Remove these first, or order a larger plan:");
    expect(html).toContain("8 channels, 5 allowed");
    expect(html).toContain("7 GB of media, 5 GB allowed");
  });
});
