import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { PlanLimitReached, PostContentInvalid } from "peal-contract";
import type { Channel, ContentViolation } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ComposerErrors,
  violationKey,
} from "#components/posts/composer-errors.tsx";
import { loadMessages } from "#i18n/messages.ts";

const bluesky: Channel = {
  avatarUrl: null,
  connection: null,
  displayName: null,
  handle: "@peal_bluesky",
  id: "00000000-0000-7000-8000-000000000001",
  platform: "bluesky",
  status: { _tag: "active" },
  tokenExpiresAt: null,
};

// A channel disconnected since: the workspace no longer lists it.
const gone = "00000000-0000-7000-8000-000000000002";

// Bluesky counts graphemes and bytes: a long text can break both limits.
const violations: readonly ContentViolation[] = [
  {
    _tag: "textTooLong",
    channelId: bluesky.id,
    length: 400,
    maximum: 300,
    platform: "bluesky",
    unit: "graphemes",
  },
  {
    _tag: "textTooLong",
    channelId: bluesky.id,
    length: 3200,
    maximum: 3000,
    platform: "bluesky",
    unit: "utf8Bytes",
  },
  { _tag: "empty", channelId: gone, platform: "mastodon" },
];

const render = async (locale: Locale) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ComposerErrors
        channels={[bluesky]}
        failure={new PostContentInvalid({ violations })}
      />
    </NextIntlClientProvider>
  );
};

describe(ComposerErrors, () => {
  it("lists each violation, by channel", async () => {
    const html = await render("en");

    expect(html).toContain("@peal_bluesky on Bluesky: 400 of 300 characters.");
    expect(html).toContain("@peal_bluesky on Bluesky: 3200 of 3000 bytes.");
    expect(html).toContain("A disconnected channel: there is nothing to");
    expect(html).not.toContain(gone);
  });

  it("speaks the reader's language", async () => {
    const html = await render("fr");

    // French sets a no-break space before a colon.
    expect(html).toContain(
      "@peal_bluesky sur Bluesky\u00A0: 3200 sur 3000 octets."
    );
    expect(html).toContain(
      "Un canal déconnecté\u00A0: il n’y a rien à publier."
    );
  });

  it("explains a month the plan has no room in", async () => {
    const messages = await loadMessages("fr");

    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <ComposerErrors
          channels={[bluesky]}
          failure={
            new PlanLimitReached({
              allowed: 30,
              limit: "scheduledPosts",
              used: 30,
              billingUrl: "https://peal.example/app/w/billing",
              plan: "free",
              planWithRoom: "starter",
            })
          }
        />
      </NextIntlClientProvider>
    );

    expect(html).toContain("ne permet pas d’autre publication ce mois-là");
  });

  it("tells apart two limits broken on one channel", () => {
    expect(new Set(violations.map(violationKey)).size).toBe(violations.length);
  });
});
