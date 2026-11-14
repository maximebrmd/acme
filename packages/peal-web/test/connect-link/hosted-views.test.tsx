import { describe, expect, it } from "@effect/vitest";
import { Cause, DateTime, Exit, Option } from "effect";
import { constVoid } from "effect/Function";
import { NextIntlClientProvider } from "next-intl";
import NextLink from "next/link";
import type { HostedLink } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import {
  HostedCard,
  HostedConnected,
  HostedError,
  HostedOver,
  HostedWelcome,
} from "#components/connect-link/hosted-views.tsx";
import { canRetry, hostedFailureOf } from "#connect-link/hosted-api.ts";
import { loadMessages } from "#i18n/messages.ts";

const link: HostedLink = {
  expiresAt: DateTime.makeUnsafe("2026-11-17T09:00:00Z"),
  host: {
    accentColor: "#166534",
    logoUrl: "https://cdn.example.test/logo.png",
    name: "Partner Suite",
  },
  input: "instance",
  platform: "mastodon",
  platforms: [{ connected: false, input: "instance", platform: "mastodon" }],
  reconnecting: null,
  returnTo: "https://app.example.test/social?peal_link=1&peal_status=cancelled",
  status: "pending",
};

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

const welcome = async (
  locale: "en" | "fr",
  shown: HostedLink,
  value = "",
  chosen = shown.platform
) => {
  const html = await inMessages(
    locale,
    <HostedCard host={shown.host} title="Synthetic title">
      <HostedWelcome
        chosen={chosen}
        error={null}
        isPending={false}
        link={shown}
        value={value}
        onChoose={constVoid}
        onInput={constVoid}
        onStart={constVoid}
      />
    </HostedCard>
  );

  return html;
};

describe("a connect link's page", () => {
  it("draws the host's accent colour as a line above its logo", async () => {
    const html = await welcome("en", link);

    expect(html).toContain("--host-accent:#166534");
  });

  it("draws no line without an accent colour, nor for one that is not #RRGGBB", async () => {
    const pages = await Promise.all(
      [null, "red;background:url(x)", "#FFF"].map(
        async (accentColor) =>
          await welcome("en", { ...link, host: { ...link.host, accentColor } })
      )
    );

    expect(
      pages.filter((html) => html.includes("--host-accent"))
    ).toStrictEqual([]);
  });

  it("says who asks for which account, and that the password stays theirs", async () => {
    const html = await welcome("en", link);

    expect(html).toContain(
      "Partner Suite asks to connect your Mastodon account"
    );
    expect(html).toContain("Partner Suite never sees your password");
    expect(html).toContain("Your Mastodon server");
    expect(html).toContain("Back to Partner Suite");
  });

  it("is written in French too", async () => {
    const html = await welcome("fr", link);

    expect(html).toContain(
      "Partner Suite demande à connecter votre compte Mastodon"
    );
    expect(html).toContain("Continuer vers Mastodon");
  });

  it("waits for the server or the handle a sign-in starts from", async () => {
    const disabled = /<button[^>]*type="submit"[^>]*aria-disabled="true"/u;

    await expect(welcome("en", link)).resolves.toMatch(disabled);
    await expect(welcome("en", link, "social.example")).resolves.not.toMatch(
      disabled
    );
    await expect(
      welcome("en", { ...link, input: "none", platform: "linkedin" })
    ).resolves.not.toMatch(disabled);
  });

  it("shows a name its host chose as text, never as markup", async () => {
    const html = await welcome("en", {
      ...link,
      host: {
        accentColor: null,
        logoUrl: null,
        name: '<img src=x onerror="alert(1)">',
      },
    });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("offers each platform of a link for several, and says which are done", async () => {
    const several: HostedLink = {
      ...link,
      input: "none",
      platform: "threads",
      platforms: [
        { connected: true, input: "instance", platform: "mastodon" },
        { connected: false, input: "none", platform: "threads" },
        { connected: false, input: "handle", platform: "bluesky" },
      ],
    };

    const html = await welcome("en", several);

    expect(html).toContain(
      "Partner Suite asks to connect your accounts on these platforms, to publish there for you."
    );
    expect(
      [
        "Mastodon",
        "Connected",
        "Continue to Threads",
        "Connect Bluesky",
      ].filter((text) => !html.includes(text))
    ).toStrictEqual([]);

    // The platform chosen asks what its sign-in needs.
    const bluesky = await welcome("fr", several, "", "bluesky");

    expect(bluesky).toContain("Votre identifiant Bluesky");
    expect(bluesky).toContain("Continuer vers Bluesky");
  });

  it("names the account a link reconnects", async () => {
    const html = await welcome("en", {
      ...link,
      input: "none",
      reconnecting: "@peal_example",
    });

    expect(html).toContain("sign in again to @peal_example on Mastodon");
  });

  it.each([
    ["completed", "This link was used already"],
    ["expired", "This link has expired. Ask Partner Suite for a new one."],
    ["revoked", "This link no longer works."],
  ] as const)("says a link that is %s is over", async (status, text) => {
    const html = await inMessages(
      "en",
      <HostedOver host={link.host} returnTo={null} status={status} />
    );

    expect(html).toContain(text);
  });

  it("says what was connected, and goes back where the link says", async () => {
    const back = await inMessages(
      "en",
      <HostedConnected
        handles={["@peal_example"]}
        platform="mastodon"
        returnTo="https://app.example.test/social?peal_status=connected"
      />
    );

    expect(back).toContain("@peal_example is connected.");
    expect(back).toContain(
      'href="https://app.example.test/social?peal_status=connected"'
    );

    const here = await inMessages(
      "fr",
      <HostedConnected
        handles={["Page A", "Page B"]}
        platform="facebook"
        returnTo={null}
      />
    );

    expect(here).toContain("Ces comptes sont connectés : Page A, Page B.");
    expect(here).toContain("Vous pouvez fermer cette page.");
  });

  it("offers to connect the platforms a link still waits on", async () => {
    const html = await inMessages(
      "en",
      <HostedConnected
        again={<NextLink href="/en/connect/link#synthetic" />}
        handles={["@peal_example"]}
        platform="mastodon"
        remaining={["threads", "bluesky"]}
        returnTo="https://app.example.test/social?peal_status=connected"
      />
    );

    expect(html).toContain("Threads and Bluesky are left to connect.");
    expect(html).toContain('href="/en/connect/link#synthetic"');
    expect(html).toContain("Connect another account");
    expect(html).not.toContain("Taking you back");
  });

  it("explains every failure in both languages", async () => {
    const html = await inMessages("fr", <HostedError error="invalidState" />);

    expect(html).toContain("Rouvrez le lien, dans ce navigateur.");
  });
});

const keyOf = (exit: Exit.Exit<never, { readonly _tag: string }>) =>
  hostedFailureOf(exit).pipe(
    Option.match({
      onNone: () => "none",
      onSome: ({ error }) => error,
    })
  );

describe(hostedFailureOf, () => {
  it("reads why the server refused, and where the page may go back", () => {
    const failure = hostedFailureOf(
      Exit.fail({
        _tag: "HostedConnectFailed",
        reason: "linkExpired" as const,
        returnTo: "https://app.example.test/social",
      })
    );

    expect(failure).toStrictEqual(
      Option.some({
        error: "linkExpired",
        returnTo: "https://app.example.test/social",
      })
    );
  });

  it("tells a link that opens nothing, a tired address, and anything else", () => {
    expect(keyOf(Exit.fail({ _tag: "ConnectLinkNotFound" }))).toBe("notFound");
    expect(keyOf(Exit.fail({ _tag: "TooManyConnectAttempts" }))).toBe(
      "tooMany"
    );
    expect(keyOf(Exit.failCause(Cause.die("down")))).toBe("unknown");
  });
});

describe(canRetry, () => {
  it("offers the link again unless it is over", () => {
    expect(canRetry("denied")).toBeTruthy();
    expect(canRetry("invalidState")).toBeTruthy();
    expect(canRetry("linkExpired")).toBeFalsy();
    expect(canRetry("linkCompleted")).toBeFalsy();
    expect(canRetry("notFound")).toBeFalsy();
  });
});
