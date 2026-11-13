import { describe, expect, it } from "@effect/vitest";
import { DateTime } from "effect";
import { NextIntlClientProvider } from "next-intl";
import { freeAccountsOf } from "peal-contract";
import { renderToStaticMarkup } from "react-dom/server";

import { GraceBanner } from "#components/billing/grace-banner.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: "en" | "fr", freeAccounts?: number) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="America/Los_Angeles"
    >
      <GraceBanner
        graceUntil={DateTime.makeUnsafe("2027-01-31T00:00:00Z")}
        {...(freeAccounts === undefined ? {} : { freeAccounts })}
      />
    </NextIntlClientProvider>
  );

describe(GraceBanner, () => {
  it("tells the grace's end in UTC, whatever the reader's zone", async () => {
    await expect(render("en")).resolves.toContain(
      "until January 31, 2027 at 12:00 AM UTC"
    );
    await expect(render("fr")).resolves.toContain(
      "jusqu’au 31 janvier 2027 à 00:00 UTC"
    );
  });

  it("names the free tier's accounts from the rate card", async () => {
    await expect(render("en")).resolves.toContain(
      `or ${freeAccountsOf()} accounts are kept`
    );
    await expect(render("en", 5)).resolves.toContain("or 5 accounts are kept");
    await expect(render("fr", 5)).resolves.toContain("5 comptes seulement");
  });
});
