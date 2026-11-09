"use client";

import { NextIntlClientProvider, useLocale } from "next-intl";
import type { ReactNode } from "react";

/**
 * Writes the dates and times of `children` in `timeZone`. The page is
 * rendered with the server's zone, which the client inherits and which is
 * not the reader's: wrap what renders after hydration, with the browser's
 * zone. The messages are those of the page.
 */
export const InTimeZone = ({
  children,
  timeZone,
}: {
  readonly children: ReactNode;
  readonly timeZone: string;
}) => {
  const locale = useLocale();

  return (
    <NextIntlClientProvider locale={locale} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
};
