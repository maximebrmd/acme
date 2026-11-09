import {
  SITE_DOCS_URL,
  SITE_PLAUSIBLE_DOMAIN,
  SITE_PLAUSIBLE_HOST,
} from "astro:env/server";

import { defaultLocale } from "./i18n/locales.ts";
import type { Locale } from "./i18n/locales.ts";

// Settings read from the environment at build time (declared in
// astro.config.ts). Each is optional: unset or empty turns its feature off.

const present = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
};

const docsOrigin = present(SITE_DOCS_URL)?.replace(/\/+$/u, "");

/**
 * A page of the docs site in the reader's language, or `undefined` when no
 * docs URL is configured. The docs serve English at the root and other
 * locales under their prefix, as this site does.
 */
export const docsLink = (locale: Locale, path = ""): string | undefined => {
  if (docsOrigin === undefined) {
    return undefined;
  }

  const prefix = locale === defaultLocale ? "" : `/${locale}`;

  return `${docsOrigin}${prefix}/${path}`;
};

export interface PlausibleScript {
  readonly domain: string;
  readonly src: string;
}

const plausibleDomain = present(SITE_PLAUSIBLE_DOMAIN);

const plausibleHost =
  present(SITE_PLAUSIBLE_HOST)?.replace(/\/+$/u, "") ?? "https://plausible.io";

/**
 * Plausible's script tag attributes when SITE_PLAUSIBLE_DOMAIN is set; with
 * SITE_PLAUSIBLE_HOST it loads from a self-hosted instance.
 */
export const plausible: PlausibleScript | undefined =
  plausibleDomain === undefined
    ? undefined
    : { domain: plausibleDomain, src: `${plausibleHost}/js/script.js` };
