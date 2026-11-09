"use client";

import { NextIntlClientProvider, useLocale } from "next-intl";
import type { ReactNode } from "react";

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
