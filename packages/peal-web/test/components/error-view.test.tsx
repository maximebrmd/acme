import { describe, expect, it } from "@effect/vitest";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "next-intl";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ErrorView } from "#components/error-view.tsx";
import { loadMessages } from "#i18n/messages.ts";

const ignore = () => {
  // The view only renders.
};

const render = async (locale: Locale) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <ErrorView
        home={createElement("a", { href: locale === "en" ? "/" : "/fr" })}
        onRetry={ignore}
      />
    </NextIntlClientProvider>
  );

describe(ErrorView, () => {
  it("tells, in English, that the error was reported", async () => {
    const html = await render("en");

    expect(html).toContain("Something went wrong");
    expect(html).toContain("which was reported");
    expect(html).toContain("Try again");
    expect(html).toContain('href="/"');
  });

  it("tells it in French too", async () => {
    const html = await render("fr");

    expect(html).toContain("Une erreur s’est produite");
    expect(html).toContain("Réessayer");
    expect(html).toContain('href="/fr"');
  });
});
