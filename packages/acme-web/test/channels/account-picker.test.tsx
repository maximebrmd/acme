import { describe, expect, it } from "@effect/vitest";
import type { ChoosableAccount } from "acme-contract";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  AccountPickerView,
  toggled,
} from "#components/channels/account-picker-view.tsx";
import { ConnectMeta } from "#components/channels/connect-meta.tsx";
import { DataDeletionStatusView } from "#components/channels/data-deletion-status.tsx";
import { loadMessages } from "#i18n/messages.ts";

const accounts: readonly ChoosableAccount[] = [
  {
    accountId: "101",
    avatarUrl: null,
    connected: false,
    displayName: "Synthetic Bakery",
    handle: "@syntheticbakery",
  },
  {
    accountId: "102",
    avatarUrl: "https://cdn.facebook.example/102.jpg",
    connected: true,
    displayName: null,
    handle: "Synthetic Studio",
  },
];

const inMessages = async (locale: "en" | "fr", element: React.ReactElement) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      {element}
    </NextIntlClientProvider>
  );

const picker = async (
  locale: "en" | "fr",
  props: Partial<ComponentProps<typeof AccountPickerView>> = {}
) => {
  const html = await inMessages(
    locale,
    <AccountPickerView
      accounts={accounts}
      cancel={null}
      error={null}
      isPending={false}
      onSubmit={constVoid}
      onToggle={constVoid}
      platform="facebook"
      selected={[]}
      {...props}
    />
  );

  return html;
};

const submitText = (html: string) =>
  /<button[^>]*type="submit"[^>]*>(?<text>[^<]*)<\/button>/u.exec(html)
    ?.groups?.["text"];

describe(toggled, () => {
  it("keeps the accounts chosen in the order they are listed", () => {
    expect(toggled(accounts, [], "102", true)).toStrictEqual(["102"]);
    expect(toggled(accounts, ["102"], "101", true)).toStrictEqual([
      "101",
      "102",
    ]);
    expect(toggled(accounts, ["101", "102"], "101", false)).toStrictEqual([
      "102",
    ]);
  });
});

describe(AccountPickerView, () => {
  it("lists each account, marks those connected, and waits for a choice", async () => {
    const html = await picker("en");

    expect(html.match(/Connected: choosing it reconnects it/gu)).toHaveLength(
      1
    );
    expect(submitText(html)).toBe("Connect");
    expect(html).toMatch(/type="submit"[^>]*aria-disabled="true"/u);
  });

  it("names each account by its name, then its handle", async () => {
    const html = await picker("en");
    const labels = [...html.matchAll(/<label[^>]*>(?<text>[^<]*)<\/label>/gu)];

    expect(labels.map((label) => label.groups?.["text"])).toStrictEqual([
      "Synthetic Bakery",
      "Synthetic Studio",
    ]);
    expect(html).toContain("@syntheticbakery");
  });

  it("counts the accounts chosen on its button, in both languages", async () => {
    expect(submitText(await picker("en", { selected: ["101"] }))).toBe(
      "Connect 1 account"
    );
    expect(submitText(await picker("fr", { selected: ["101", "102"] }))).toBe(
      "Connecter 2 comptes"
    );
  });

  it("says why a choice failed", async () => {
    const html = await picker("en", { error: "invalidState" });

    expect(html).toContain(
      "This connection expired or was started elsewhere. Start again."
    );
  });
});

describe(ConnectMeta, () => {
  it.each([
    ["facebook", "Connect Facebook Pages"],
    ["instagram", "Connect Instagram"],
    ["threads", "Connect Threads"],
  ] as const)("offers %s with its own button", async (platform, label) => {
    const html = await inMessages(
      "en",
      <ConnectMeta
        error={null}
        isPending={false}
        onConnect={constVoid}
        platform={platform}
      />
    );

    expect(html).toContain(label);
  });

  it("explains a sign-in that reached no account", async () => {
    const html = await inMessages(
      "fr",
      <ConnectMeta
        error="noAccounts"
        isPending={false}
        onConnect={constVoid}
        platform="instagram"
      />
    );

    expect(html).toContain("aucun compte à connecter");
  });
});

describe(DataDeletionStatusView, () => {
  it("tells a request carried out, without a date before it runs in a browser", async () => {
    const html = await inMessages(
      "en",
      <DataDeletionStatusView
        lookup={{
          _tag: "found",
          app: "facebook",
          channelsDeleted: 2,
          completedAt: Date.UTC(2026, 10, 9),
          confirmationCode: "0123456789abcdef0123456789abcdef",
        }}
      />
    );

    expect(html).toContain(
      "Confirmation code: 0123456789abcdef0123456789abcdef"
    );
    expect(html).toContain(
      "Done: Acme deleted the accounts it had connected through Facebook"
    );
  });

  it("says when no request has the code, or the status is out of reach", async () => {
    await expect(
      inMessages("fr", <DataDeletionStatusView lookup={{ _tag: "notFound" }} />)
    ).resolves.toContain("Aucune demande n’a ce code de confirmation.");
    await expect(
      inMessages(
        "en",
        <DataDeletionStatusView lookup={{ _tag: "unavailable" }} />
      )
    ).resolves.toContain("The status could not be read.");
  });
});
