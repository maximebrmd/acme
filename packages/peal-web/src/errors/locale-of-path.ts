import { hasLocale } from "next-intl";
import type { Locale } from "next-intl";

import { routing } from "#i18n/routing.ts";

/** The language a path is in: French under /fr, English otherwise. */
export const localeOfPath = (pathname: string): Locale => {
  const [, first = ""] = pathname.split("/");

  return hasLocale(routing.locales, first) ? first : routing.defaultLocale;
};
