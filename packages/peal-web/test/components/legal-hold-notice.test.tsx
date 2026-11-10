import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { LegalHoldNotice } from "#components/account/legal-hold-notice.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (
  locale: "en" | "fr",
  props: ComponentProps<typeof LegalHoldNotice>
) => {
  const messages = await loadMessages(locale);

  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LegalHoldNotice {...props} />
    </NextIntlClientProvider>
  );
};

describe(LegalHoldNotice, () => {
  it("says nothing on a server that keeps nothing for the law", async () => {
    await expect(render("en", { legalHold: null })).resolves.toBe("");
  });

  it("says what a server French law obliges keeps of a closed account, and for how long", async () => {
    const legalHold = { accountYears: 1, connectionYears: 1, identityYears: 5 };

    await expect(render("en", { legalHold })).resolves.toContain(
      "your name and email address for 5 years, and how you signed in and the connections that created content for 1 year"
    );
    await expect(render("fr", { legalHold })).resolves.toContain(
      "vos nom et adresse e-mail pendant 5 ans"
    );
  });

  it("says only the connections already kept stay, on a server that stopped keeping them", async () => {
    const html = await render("en", {
      legalHold: {
        accountYears: null,
        connectionYears: 1,
        identityYears: null,
      },
    });

    expect(html).toContain("kept so far, stay 1 year from each");
    expect(html).not.toContain("your name and email address");
  });
});
