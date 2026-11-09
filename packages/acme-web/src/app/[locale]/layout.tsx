import { GeistMono, GeistSans } from "acme-ui/lib/fonts";
import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AppShell } from "#components/app-shell.tsx";
import { ViewerTimeZone } from "#components/in-time-zone.tsx";
import { Providers } from "#components/providers.tsx";
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

  return { description: t("description"), title: t("title") };
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
