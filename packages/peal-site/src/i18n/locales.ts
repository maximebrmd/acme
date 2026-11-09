// The site's languages. English is the default and has no URL prefix; every
// other locale lives under /<code>/. astro.config.ts reads this list, so a new
// language is added here, with its catalogue in ./messages.ts and its legal
// documents in src/content/legal/<code>/.
export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/**
 * The locale Astro resolved for the current page (`Astro.currentLocale`),
 * narrowed to one this site defines.
 */
export const pageLocale = (current: string | undefined): Locale =>
  locales.find((locale) => locale === current) ?? defaultLocale;

/**
 * `getStaticPaths` entries for a page under `src/pages/[...locale]/`: the
 * default locale renders at the root, the others under their prefix.
 */
export const localePaths = () =>
  locales.map((locale) => ({
    params: { locale: locale === defaultLocale ? undefined : locale },
  }));
