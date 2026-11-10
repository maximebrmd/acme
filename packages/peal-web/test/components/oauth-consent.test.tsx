import { describe, expect, it } from "@effect/vitest";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OAuthConsentView } from "#components/oauth/oauth-consent.tsx";
import { ScopeList } from "#components/oauth/scope-list.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (
  locale: "en" | "fr",
  props: Partial<ComponentProps<typeof OAuthConsentView>>
) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
    >
      <OAuthConsentView
        allowAds
        allowPublishing
        failed={false}
        pending={false}
        redirectHost="client.example"
        scopes={["openid", "workspace:write", "workspace:publish"]}
        workspaceName="Studio"
        onAdsChange={constVoid}
        onAllow={constVoid}
        onDeny={constVoid}
        onPublishingChange={constVoid}
        {...props}
      />
    </NextIntlClientProvider>
  );

const publishing =
  "schedule and publish posts to your connected accounts, where everyone can see them";

describe(OAuthConsentView, () => {
  it("lets the person leave publishing out, ticked at first", async () => {
    const html = await render("en", {});

    expect(html.match(/role="checkbox"/gu)).toHaveLength(1);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain(`Let it ${publishing}`);
    expect(html).toContain(
      "Without this, it can still write drafts, which you review and schedule yourself."
    );
  });

  it("keeps publishing out of the list, as the box's line alone", async () => {
    const html = await render("en", {});

    expect(html).not.toContain(`<li>Schedule and publish`);
    expect(html).toContain("without scheduling or publishing anything");
  });

  it("shows the box unticked once the person leaves publishing out", async () => {
    const html = await render("en", { allowPublishing: false });

    expect(html).toContain('aria-checked="false"');
  });

  it("offers no box to a client that did not ask to publish", async () => {
    const html = await render("en", {
      scopes: ["openid", "workspace:write"],
    });

    expect(html).not.toContain('role="checkbox"');
    expect(html).not.toContain(publishing);
  });

  it("says a client that only reads keeps reading", async () => {
    const html = await render("en", {
      scopes: ["workspace:read", "workspace:publish"],
    });

    expect(html).toContain(
      "Without this, it can still read the workspace, and nothing more."
    );
    expect(html).toContain("<li>Read the workspace");
  });

  it("lists publishing as asked when it is all the client asks of the workspace", async () => {
    const html = await render("en", {
      scopes: ["openid", "workspace:publish"],
    });

    expect(html).not.toContain('role="checkbox"');
    expect(html).toContain(`<li>Schedule and publish`);
  });

  it("writes the choice in French", async () => {
    const html = await render("fr", {});

    expect(html).toContain(
      "L’autoriser à programmer et publier des publications sur vos comptes connectés, où tout le monde peut les voir"
    );
    expect(html).toContain(
      "Sans cela, elle peut toujours rédiger des brouillons, que vous relisez et programmez vous-même."
    );
  });
});

describe("OAuthConsentView with ads", () => {
  const scopes = [
    "openid",
    "workspace:write",
    "workspace:publish",
    "workspace:ads",
  ];

  it("gives ads a box of their own, ticked at first, beside publishing's", async () => {
    const html = await render("en", { scopes });

    expect(html.match(/role="checkbox"/gu)).toHaveLength(2);
    expect(html).toContain(
      "Let it connect ad accounts and, where it may also publish, spend on ads from them, within the monthly ceiling an owner set"
    );
    expect(html).toContain(
      "Without this, it does nothing with ads: it connects no ad account and spends nothing."
    );
    expect(html).not.toContain("<li>Connect ad accounts");
  });

  it("shows the box unticked once the person leaves ads out", async () => {
    const html = await render("en", { allowAds: false, scopes });

    expect(html.match(/aria-checked="false"/gu)).toHaveLength(1);
  });

  it("lists ads as asked when they are all the client asks of the workspace", async () => {
    const html = await render("en", { scopes: ["openid", "workspace:ads"] });

    expect(html).not.toContain('role="checkbox"');
    expect(html).toContain("<li>Connect ad accounts");
  });

  it("writes the choice in French", async () => {
    const html = await render("fr", { scopes });

    expect(html).toContain(
      "L’autoriser à connecter des comptes publicitaires et, si elle peut aussi publier, à dépenser en publicité depuis ces comptes, dans la limite du plafond mensuel fixé par un propriétaire"
    );
  });
});

describe(ScopeList, () => {
  it("gives ads their own line, as the device page shows it", async () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={await loadMessages("en")}>
        <ScopeList scopes={["workspace:read", "workspace:ads"]} />
      </NextIntlClientProvider>
    );

    expect(html.match(/<li>/gu)).toHaveLength(2);
    expect(html).toContain(
      "<li>Connect ad accounts and, where it may also publish, spend on ads from them, within the monthly ceiling an owner set"
    );
  });

  it("gives publishing its own line, as the device page shows it", async () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={await loadMessages("en")}>
        <ScopeList
          scopes={["workspace:read", "workspace:write", "workspace:publish"]}
        />
      </NextIntlClientProvider>
    );

    expect(html.match(/<li>/gu)).toHaveLength(2);
    expect(html).toContain(`<li>Schedule and publish`);
    expect(html).not.toContain("Read the workspace");
  });
});
