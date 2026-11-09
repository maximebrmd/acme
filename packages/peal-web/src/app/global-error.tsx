"use client";

import { GeistMono, GeistSans } from "peal-ui/lib/fonts";
import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorView } from "#components/error-view.tsx";
import { reportBrowserError } from "#errors/browser.ts";
import { localeOfPath } from "#errors/locale-of-path.ts";
import { loadMessages } from "#i18n/messages.ts";
import type { Messages } from "#i18n/messages.ts";
import { Link } from "#i18n/navigation.ts";

import "#app/globals.css";

// The page shown when the app's own frame failed: it replaces the whole
// document, so it brings its own, and loads the reader's catalogue, which
// the frame provided. The error is reported first.
const GlobalError = ({
  error,
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) => {
  const locale = localeOfPath(usePathname());
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    reportBrowserError(error, "boundary");
  }, [error]);

  useEffect(() => {
    void loadMessages(locale).then(setMessages);
  }, [locale]);

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <main className="mx-auto w-full max-w-5xl px-4 py-10">
          {messages === null ? null : (
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ErrorView
                home={<Link href="/" locale={locale} />}
                onRetry={retry}
              />
            </NextIntlClientProvider>
          )}
        </main>
      </body>
    </html>
  );
};

export default GlobalError;
