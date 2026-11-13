import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import type { BillingAccount } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { BillingAccountView } from "#components/billing/billing-account-view.tsx";
import type { BillingAccountViewProps } from "#components/billing/billing-account-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const nothing = () => {
  // Rendered once: nothing is clicked.
};

const account: BillingAccount = {
  billingWorkspaceId: "north",
  billingWorkspaceName: "Studio Nord",
  id: "0190f3a0-0000-7000-8000-00000000b001",
  otherWorkspaces: [{ name: "Studio Sud", workspaceId: "south" }],
  partner: false,
  payer: true,
  transfer: null,
  workspaces: 2,
};

const owners = [
  {
    email: "sam@example.com",
    joinedAt: DateTime.makeUnsafe("2026-11-01T10:00:00Z"),
    name: "Sam Example",
    role: "owner",
    userId: "sam",
  },
];

const render = async (
  locale: "en" | "fr",
  props: Partial<BillingAccountViewProps> = {}
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <BillingAccountView
        account={account}
        canManage
        error={null}
        // The app links through next-intl's Link, which needs Next to run.
        linkTo={(id, name) => <a href={`#${id}`}>{name}</a>}
        owners={owners}
        pending={null}
        userId="ana"
        workspaceId="north"
        onAccept={nothing}
        onOffer={nothing}
        onWithdraw={nothing}
        {...props}
      />
    </NextIntlClientProvider>
  );
};

describe(BillingAccountView, () => {
  it("tells the payer their workspaces share one plan, billed here", async () => {
    const html = await render("en");

    expect(html).toContain("You pay for this account");
    expect(html).toContain(
      "This workspace bills the account, for its 2 workspaces"
    );
    expect(html).toContain('<a href="#south">Studio Sud</a>');
    expect(html).toContain("Hand this workspace to another owner");
  });

  it("names the workspace that bills, linked for its members", async () => {
    const html = await render("fr", {
      account: { ...account, payer: false },
      workspaceId: "south",
    });

    expect(html).toContain("Une autre personne paie ce compte");
    expect(html).toContain(
      'L’abonnement se commande sur <a href="#north">Studio Nord</a>'
    );
    expect(html).not.toContain("Confier cet espace de travail");
  });

  it("does not name a billing workspace the reader is not a member of", async () => {
    const html = await render("en", {
      account: { ...account, billingWorkspaceName: null, payer: false },
      workspaceId: "south",
    });

    expect(html).toContain("another workspace of the account");
    expect(html).not.toContain("Studio Nord");
  });

  it("offers the owner it was offered to to accept or decline", async () => {
    const html = await render("en", {
      account: {
        ...account,
        transfer: {
          expiresAt: DateTime.makeUnsafe("2026-11-20T10:00:00Z"),
          offeredAt: DateTime.makeUnsafe("2026-11-13T10:00:00Z"),
          offeredBy: "sam",
          toUserId: "ana",
        },
      },
    });

    expect(html).toContain(
      "You were offered this workspace until November 20, 2026"
    );
    expect(html).toContain("Accept");
    expect(html).toContain("Decline");
  });

  it("lets its payer withdraw the offer", async () => {
    const html = await render("en", {
      account: {
        ...account,
        transfer: {
          expiresAt: DateTime.makeUnsafe("2026-11-20T10:00:00Z"),
          offeredAt: DateTime.makeUnsafe("2026-11-13T10:00:00Z"),
          offeredBy: "ana",
          toUserId: "sam",
        },
      },
    });

    expect(html).toContain("Offered to Sam Example until November 20, 2026");
    expect(html).toContain("Withdraw the offer");
  });

  it("says why a request failed", async () => {
    await expect(render("en", { error: "subscribed" })).resolves.toContain(
      "cancel it first, or hand over another workspace"
    );
  });
});
