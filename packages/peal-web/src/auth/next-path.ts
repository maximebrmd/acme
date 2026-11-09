import { Option, Schema } from "effect";
import type { Locale } from "next-intl";

import { routing } from "#i18n/routing.ts";

// A path on this site: one slash, then anything but a second slash or a
// backslash (which browsers read as another host), and no whitespace.
const NextPathSchema = Schema.String.check(
  Schema.isPattern(/^\/(?![/\\])\S*$/u)
);

const decodeNextPath = Schema.decodeUnknownOption(NextPathSchema);

/**
 * Where to go after signing in, from a page's `next` query parameter: a
 * path on this site, never another one, so a link cannot send people away.
 */
export const nextPathOf = (
  value: string | readonly string[] | undefined
): Option.Option<string> => decodeNextPath(value);

const decodeLocale = Schema.decodeUnknownOption(
  Schema.Literals(routing.locales)
);

// A path that opens in a language of its own: /fr, /fr/app, /fr?x.
const localePrefix = new RegExp(
  `^/(?:${routing.locales.join("|")})(?:[/?#]|$)`,
  "u"
);

/**
 * The language to open `next` in once signed in: the one the account keeps,
 * so the app speaks it whichever page the person signed in from, unless the
 * path names a language itself.
 */
export const landingLocale = (
  next: string,
  accountLocale: string | null | undefined
): Option.Option<Locale> =>
  localePrefix.test(next) ? Option.none() : decodeLocale(accountLocale);
