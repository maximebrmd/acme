"use client";

import { NextIntlClientProvider, useLocale } from "next-intl";
import type { ReactNode } from "react";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";

/**
 * Writes the dates and times of `children` in `timeZone`, or in the zone of
 * the provider above when it is none. The messages are those of the page.
 */
export const InTimeZone = ({
  children,
  timeZone,
}: {
  readonly children: ReactNode;
  readonly timeZone: string | undefined;
}) => {
  const locale = useLocale();

  return (
    <NextIntlClientProvider
      locale={locale}
      {...(timeZone === undefined ? {} : { timeZone })}
    >
      {children}
    </NextIntlClientProvider>
  );
};

/**
 * Writes every date of the page in the viewer's time zone. The page is
 * rendered with the server's zone (UTC in the image), which the client
 * inherits: once the page has hydrated, the browser's zone replaces it, and
 * what shows a date renders again. The tree stays the same, so nothing
 * below loses its state.
 */
export const ViewerTimeZone = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const hydrated = useHydrated();

  return (
    <InTimeZone timeZone={hydrated ? browserTimeZone() : undefined}>
      {children}
    </InTimeZone>
  );
};
