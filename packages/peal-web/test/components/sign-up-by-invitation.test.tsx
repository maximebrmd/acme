import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { FormError } from "#components/auth/form-error.tsx";
import { SignUpByInvitation } from "#components/auth/sign-up-by-invitation.tsx";
import { loadMessages } from "#i18n/messages.ts";

const render = async (locale: Locale, node: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
    >
      {node}
    </NextIntlClientProvider>
  );

describe(SignUpByInvitation, () => {
  it.each([
    ["en", "Accounts here are made by invitation"],
    ["fr", "Les comptes sont créés ici sur invitation"],
  ] as const)(
    "says accounts are made by invitation, in %s",
    async (locale, text) => {
      await expect(render(locale, <SignUpByInvitation />)).resolves.toContain(
        text
      );
    }
  );
});

describe("the server's refusal of a sign-up", () => {
  it.each([
    ["en", "This server makes accounts by invitation only"],
    ["fr", "Ce serveur ne crée de comptes que sur invitation"],
  ] as const)("reads as words, in %s", async (locale, text) => {
    await expect(
      render(locale, <FormError error="SIGN_UP_BY_INVITATION" />)
    ).resolves.toContain(text);
  });
});
