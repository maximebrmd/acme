import { describe, expect, it } from "@effect/vitest";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import type { ChoosableAccount } from "peal-contract";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { choiceStart } from "#channels/choice-connection.ts";
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
      startOver={<button type="button">Start over</button>}
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

  // The choice is gone: only a new sign-in brings the accounts back.
  it("offers a new sign-in, and no more choosing, once the choice is spent", async () => {
    const html = await picker("en", {
      error: "invalidState",
      selected: ["101"],
    });

    expect(html).toMatch(/type="submit"[^>]*aria-disabled="true"/u);
    expect(html).toContain("Start over");
    expect(html).not.toContain("Choose again");
  });

  // The server kept the choice: the member tries again, or signs in again.
  it.each([
    [
      "en",
      "unreachable",
      "Choose again, or sign in with Facebook again for a new list.",
    ],
    [
      "fr",
      "planLimit",
      "Choisissez à nouveau, ou reconnectez-vous avec Facebook pour une nouvelle liste.",
    ],
  ] as const)(
    "lets the member try again after a failure that kept the choice (%s, %s)",
    async (locale, error, hint) => {
      const html = await picker(locale, { error, selected: ["101"] });

      expect(html).not.toMatch(/type="submit"[^>]*aria-disabled="true"/u);
      expect(html).toContain(hint);
      expect(html).toContain("Start over");
    }
  );

  it("names a Google Business Profile's locations, and Google as where to sign in again", async () => {
    const html = await picker("en", {
      error: "unreachable",
      platform: "googleBusiness",
      selected: ["101"],
    });

    expect(html).toContain("Your sign-in reached these verified locations.");
    expect(html).toContain("The locations to connect");
    expect(html).toContain(
      "Choose again, or sign in with Google again for a new list."
    );

    await expect(
      picker("fr", { error: "unreachable", platform: "googleBusiness" })
    ).resolves.toContain(
      "Choisissez à nouveau, ou reconnectez-vous avec Google pour une nouvelle liste."
    );
  });

  // Each family of platforms signs in somewhere else: a LinkedIn page is
  // not reached through Facebook.
  it.each([
    [
      "facebook",
      "sign in with Facebook again",
      "reconnectez-vous avec Facebook",
    ],
    [
      "instagram",
      "sign in with Facebook again",
      "reconnectez-vous avec Facebook",
    ],
    ["youtube", "sign in with Google again", "reconnectez-vous avec Google"],
    [
      "googleBusiness",
      "sign in with Google again",
      "reconnectez-vous avec Google",
    ],
    [
      "linkedin",
      "sign in with LinkedIn again",
      "reconnectez-vous avec LinkedIn",
    ],
    // A platform that gains a choice later names no other platform's login.
    ["pinterest", "sign in again", "reconnectez-vous"],
  ] as const)(
    "says where to sign in again for a new list of %s accounts",
    async (platform, english, french) => {
      await expect(
        picker("en", { error: "unreachable", platform })
      ).resolves.toContain(`Choose again, or ${english} for a new list.`);
      await expect(
        picker("fr", { error: "unreachable", platform })
      ).resolves.toContain(
        `Choisissez à nouveau, ou ${french} pour une nouvelle liste.`
      );
    }
  );

  it("signs in again the way the choice came through", () => {
    expect(choiceStart("linkedin")).toStrictEqual({
      connection: "linkedinPage",
    });
    expect(choiceStart("instagram")).toStrictEqual({
      connection: "facebookLogin",
    });
    expect(choiceStart("facebook")).toStrictEqual({});
    expect(choiceStart("googleBusiness")).toStrictEqual({});
  });

  it("names LinkedIn's pages as those the member administers", async () => {
    const html = await picker("en", { platform: "linkedin" });

    expect(html).toContain("The LinkedIn pages to connect");
    expect(html).toContain("You administer these LinkedIn pages.");
  });

  it("offers no new sign-in before anything failed", async () => {
    await expect(picker("en", { selected: ["101"] })).resolves.not.toContain(
      "Start over"
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
      "Done: Peal deleted the accounts it had connected through Facebook"
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
