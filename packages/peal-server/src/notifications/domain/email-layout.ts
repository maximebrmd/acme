import { DateTime } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

import type { EmailCatalog } from "./email-catalog.ts";
import { english } from "./english.ts";
import { french } from "./french.ts";

/** Every email's words, by language. */
export const catalogs: Readonly<Record<Locale, EmailCatalog>> = {
  en: english,
  fr: french,
};

/** An email ready to send: its subject, and the same words as HTML and text. */
export interface RenderedEmail {
  readonly html: string;
  readonly subject: string;
  readonly text: string;
}

const htmlEntities: ReadonlyMap<string, string> = new Map([
  ['"', "&quot;"],
  ["&", "&amp;"],
  ["'", "&#39;"],
  ["<", "&lt;"],
  [">", "&gt;"],
]);

/** Text, made safe to place in HTML content and attribute values. */
export const escapeHtml = (value: string): string =>
  value.replaceAll(
    /["&'<>]/gu,
    (character) => htmlEntities.get(character) ?? character
  );

/**
 * An instant as an email writes it. Readers' time zones are not known:
 * instants are written in UTC, and say so.
 */
export const instantIn = (instant: DateTime.Utc, locale: Locale): string =>
  `${DateTime.format(instant, {
    dateStyle: "long",
    locale,
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;

/** An amount in its currency's cents, as the reader writes money. */
export const moneyIn = (
  { amount, currency }: { readonly amount: number; readonly currency: string },
  locale: Locale
): string =>
  new Intl.NumberFormat(locale, {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100);

const placeholder = /\{(?<name>\w+)\}/gu;

export const fill = (
  template: string,
  values: ReadonlyMap<string, string>,
  encode: (value: string) => string
): string =>
  template.replaceAll(placeholder, (match, name: string) => {
    const value = values.get(name);

    return value === undefined ? match : encode(value);
  });

export const keep = (value: string): string => value;

/** The button of an email, and the link written out beneath it. */
export interface EmailLink {
  readonly action: string;
  readonly linkFallback: string;
  readonly url: string;
}

const linkParagraphs = ({ action, linkFallback, url }: EmailLink) => [
  `<p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:6px;background-color:#18181b;color:#ffffff;font-weight:600;text-decoration:none;">${action}</a></p>`,
  `<p style="margin:0 0 4px;color:#52525b;font-size:14px;">${linkFallback}</p>`,
  `<p style="margin:0 0 24px;font-size:14px;word-break:break-all;"><a href="${url}" style="color:#18181b;">${url}</a></p>`,
];

const framed = (
  parts: {
    /** What follows the body, each an HTML block of its own. */
    readonly blocks?: readonly string[];
    readonly body: string;
    readonly highlight?: string;
    readonly ignore: string;
    readonly locale: Locale;
    readonly signature: string;
  },
  link: readonly string[]
): string =>
  [
    "<!doctype html>",
    `<html lang="${parts.locale}">`,
    "<body style=\"margin:0;padding:24px;background-color:#f4f4f5;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;\">",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;"><tr><td style="padding:32px;">',
    `<p style="margin:0 0 24px;">${parts.body}</p>`,
    ...(parts.blocks ?? []),
    ...(parts.highlight === undefined
      ? []
      : [
          `<p style="margin:0 0 24px;padding:12px 16px;border:2px solid #18181b;border-radius:6px;font-weight:600;">${parts.highlight}</p>`,
        ]),
    ...link,
    `<p style="margin:0 0 24px;color:#52525b;font-size:14px;">${parts.ignore}</p>`,
    `<p style="margin:0;color:#52525b;font-size:14px;">${parts.signature}</p>`,
    "</td></tr></table>",
    "</td></tr></table>",
    "</body>",
    "</html>",
  ].join("\n");

/**
 * The layout of an email that links nowhere: one to a visitor of a review
 * link, whose address Peal does not keep.
 */
export const linklessLayout = (parts: {
  readonly body: string;
  readonly ignore: string;
  readonly locale: Locale;
  readonly signature: string;
}): string => framed(parts, []);

// One layout for every email: inline styles and tables, as email clients
// ignore stylesheets, with a button and the link written out beneath it.
export const layout = (parts: {
  readonly action: string;
  readonly body: string;
  /** What the email sets apart in a box under its body, if anything. */
  readonly highlight?: string;
  readonly ignore: string;
  readonly linkFallback: string;
  readonly locale: Locale;
  readonly signature: string;
  readonly url: string;
}): string => framed(parts, linkParagraphs(parts));

/**
 * The layout of the weekly digest: its introduction, a block for each
 * workspace, then the button, why it comes and how to stop it.
 */
export const digestLayout = (parts: {
  readonly action: string;
  readonly blocks: readonly string[];
  readonly body: string;
  readonly ignore: string;
  readonly linkFallback: string;
  readonly locale: Locale;
  readonly signature: string;
  readonly url: string;
}): string => framed(parts, linkParagraphs(parts));
