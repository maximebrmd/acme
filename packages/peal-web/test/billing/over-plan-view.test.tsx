import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Standing } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { OverPlanView } from "#components/billing/over-plan-view.tsx";
import type { OverPlanViewProps } from "#components/billing/over-plan-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const nothing = () => {
  // Rendered once: nothing is clicked.
};

const standing: Standing = {
  account: {
    billingWorkspaceId: "studio",
    billingWorkspaceName: "Studio Nord",
    id: "0190f3a0-0000-7000-8000-00000000b001",
    otherWorkspaces: [],
    partner: false,
    payer: true,
    transfer: null,
    workspaces: 1,
  },
  mustReduce: true,
  over: [
    { allowed: 3, limit: "channels", used: 4 },
    { allowed: 2, limit: "members", used: 3 },
    { allowed: 500_000_000, limit: "mediaStorage", used: 900_000_000 },
  ],
  plan: "free",
  planWithRoom: "starter",
  scheduledPosts: 7,
};

const channels = ["one", "two", "three", "four"].map((handle) => ({
  id: handle,
  name: `@${handle}@social.example`,
  platform: "mastodon",
}));

const members = [
  { name: "Ana Example", role: "owner", userId: "ana" },
  { name: "Sam Example", role: "admin", userId: "sam" },
  { name: "Lee Example", role: "viewer", userId: "lee" },
];

const render = async (
  locale: "en" | "fr",
  props: Partial<OverPlanViewProps> = {}
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <OverPlanView
        applying={false}
        // The app links through next-intl's Link, which needs Next to run.
        billingLink={<span>Open billing</span>}
        canManage
        channels={channels}
        confirmed={false}
        error={null}
        keptChannels={["one", "two", "three"]}
        keptMembers={["ana", "sam"]}
        managers={["Ana Example", "Sam Example"]}
        members={members}
        self="ana"
        standing={standing}
        upgrade={<p>The upgrade offer</p>}
        workspaceName="Studio Nord"
        onApply={nothing}
        onConfirm={nothing}
        onKeepChannel={nothing}
        onKeepMember={nothing}
        {...props}
      />
    </NextIntlClientProvider>
  );
};

describe(OverPlanView, () => {
  it("names the account's other workspaces, which count their channels with this one", async () => {
    const shared = {
      ...standing,
      account: {
        ...standing.account,
        otherWorkspaces: [{ name: "Studio Sud", workspaceId: "south" }],
        workspaces: 3,
      },
    };

    await expect(render("en", { standing: shared })).resolves.toContain(
      "Its channels count with those of the other workspaces of its billing account: Studio Sud."
    );
    await expect(render("fr", { standing: shared })).resolves.toContain(
      "Ses canaux comptent avec ceux des autres espaces de travail de son compte de facturation : Studio Sud."
    );
    await expect(render("en")).resolves.not.toContain("billing account");
  });

  it("says what the workspace holds beyond its plan, and that nothing was deleted", async () => {
    const html = await render("en");

    expect(html).toContain("Studio Nord holds more than its plan allows");
    expect(html).toContain("Its plan is now Free. Nothing was deleted");
    expect(html).toContain("4 channels connected, 3 allowed");
    expect(html).toContain("3 members, 2 allowed");
    expect(html).toContain("900 MB of media stored, 500 MB allowed");
  });

  it("says what happens to the posts already scheduled", async () => {
    const html = await render("en");

    expect(html).toContain(
      "The 7 posts scheduled this month each fail at their time, with “plan limit” as their reason; they keep their text and channels, and can be posted again from their page once the workspace is within its plan."
    );
  });

  it("offers the upgrade first, then choosing what stays", async () => {
    const html = await render("en");

    expect(html.indexOf("The upgrade offer")).toBeGreaterThan(-1);
    expect(html.indexOf("Or choose what stays")).toBeGreaterThan(
      html.indexOf("The upgrade offer")
    );
    expect(html).toContain("Channels that stay connected (3 of 3)");
    expect(html).toContain("Members who stay (2 of 2)");
  });

  it("asks to confirm what is removed, for good, before it removes anything", async () => {
    const html = await render("en");

    expect(html).toContain(
      "I understand that 1 channel is disconnected and 1 member is removed, for good."
    );
    expect(html).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Keep these, remove the rest/u
    );
    expect(html).toContain("the platforms that allow it are asked to forget");
  });

  it("refuses a choice that keeps more than the plan allows", async () => {
    const html = await render("en", {
      confirmed: true,
      keptChannels: ["one", "two", "three", "four"],
    });

    expect(html).toContain("Keep at most what the plan allows.");
    expect(html).toMatch(
      /<button[^>]*aria-disabled="true"[^>]*>Keep these, remove the rest/u
    );
  });

  it("tells the other members who can fix it, in their language", async () => {
    const html = await render("fr", { canManage: false });

    expect(html).toContain(
      "Les propriétaires et les administrateurs de Studio Nord peuvent commander un abonnement supérieur ou choisir ce qui reste : Ana Example, Sam Example."
    );
    expect(html).not.toContain("Garder ceux-ci");
    expect(html).not.toContain("The upgrade offer");
  });
});
