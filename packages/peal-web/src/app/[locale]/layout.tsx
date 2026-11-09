import { Effect } from "effect";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { GeistMono, GeistSans } from "peal-ui/lib/fonts";

import { AppShell } from "#components/app-shell.tsx";
import { Providers } from "#components/providers.tsx";
import { ViewerTimeZone } from "#components/viewer-time-zone.tsx";
import { releaseMeta } from "#errors/release-meta.ts";
import { releaseConfig } from "#errors/server.ts";
import { routing } from "#i18n/routing.ts";

import "#app/globals.css";

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async ({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  // The release, which error reports from the browser name.
  const release = await Effect.runPromise(releaseConfig);

  return {
    description: t("description"),
    other: { [releaseMeta]: release },
    title: t("title"),
  };
};

const LocaleLayout = async ({ children, params }: LayoutProps<"/[locale]">) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <NextIntlClientProvider>
          <ViewerTimeZone>
            <Providers>
              <AppShell>{children}</AppShell>
            </Providers>
          </ViewerTimeZone>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
