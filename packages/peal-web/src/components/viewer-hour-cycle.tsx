"use client";

import { NextIntlClientProvider, useLocale } from "next-intl";
import type { ReactNode } from "react";

import { timeFormatsOf, useHourFormat } from "#i18n/hour-cycle.ts";
import type { HourFormat } from "#i18n/hour-cycle.ts";

/**
 * Writes the times of `children` on the clock `format` names, wherever a
 * message writes one (`{at, time, short}`); the language's own clock for
 * `auto`. The messages and the time zone are those of the provider above.
 */
export const InHourFormat = ({
  children,
  format,
}: {
  readonly children: ReactNode;
  readonly format: HourFormat;
}) => {
  const locale = useLocale();
  const formats = timeFormatsOf(format);

  return (
    <NextIntlClientProvider
      locale={locale}
      {...(formats === undefined ? {} : { formats })}
    >
      {children}
    </NextIntlClientProvider>
  );
};

/**
 * Writes every time of the page on the clock the viewer chose in this
 * browser (12-hour, 24-hour or their language's). The page is rendered
 * with the language's clock; the preference replaces it once the page has
 * hydrated. The tree stays the same, so nothing below loses its state.
 */
export const ViewerHourCycle = ({
  children,
}: {
  readonly children: ReactNode;
}) => <InHourFormat format={useHourFormat()}>{children}</InHourFormat>;
