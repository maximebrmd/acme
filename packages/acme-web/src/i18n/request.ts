import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";

import { loadMessages } from "#i18n/messages.ts";
import { routing } from "#i18n/routing.ts";

// The locale comes from the [locale] segment, which the proxy fills in for
// unprefixed English paths.
export default getRequestConfig(async ({ locale: requested }) => {
  const locale = requested ?? (await rootParams.locale());

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return { locale, messages: await loadMessages(locale) };
});
