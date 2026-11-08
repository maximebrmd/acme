import type { Locale } from "#shared/domain/locale.ts";

import type { AuthEmail } from "./auth-email.ts";
import type { EmailCatalog, EmailMessages } from "./email-catalog.ts";
import { english } from "./english.ts";
import { french } from "./french.ts";

const catalogs: Readonly<Record<Locale, EmailCatalog>> = {
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

const placeholder = /\{(?<name>\w+)\}/gu;

const fill = (
  template: string,
  values: ReadonlyMap<string, string>,
  encode: (value: string) => string
): string =>
  template.replaceAll(placeholder, (match, name: string) => {
    const value = values.get(name);

    return value === undefined ? match : encode(value);
  });

const keep = (value: string): string => value;

interface Content {
  readonly messages: EmailMessages;
  readonly values: ReadonlyMap<string, string>;
}

const contentOf = (email: AuthEmail, catalog: EmailCatalog): Content => {
  if (email._tag !== "Invitation") {
    return {
      messages:
        email._tag === "ResetPassword"
          ? catalog.resetPassword
          : catalog.verifyEmail,
      values: new Map(),
    };
  }

  const roles: ReadonlyMap<string, string> = new Map(
    Object.entries(catalog.roles)
  );

  return {
    messages: catalog.invitation,
    values: new Map([
      ["inviterName", email.inviterName],
      ["role", roles.get(email.role) ?? email.role],
      ["workspaceName", email.workspaceName],
    ]),
  };
};

// One layout for every email: inline styles and tables, as email clients
// ignore stylesheets, with a button and the link written out beneath it.
const layout = (parts: {
  readonly action: string;
  readonly body: string;
  readonly ignore: string;
  readonly linkFallback: string;
  readonly locale: Locale;
  readonly signature: string;
  readonly url: string;
}): string =>
  [
    "<!doctype html>",
    `<html lang="${parts.locale}">`,
    "<body style=\"margin:0;padding:24px;background-color:#f4f4f5;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:24px;\">",
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;"><tr><td style="padding:32px;">',
    `<p style="margin:0 0 24px;">${parts.body}</p>`,
    `<p style="margin:0 0 24px;"><a href="${parts.url}" style="display:inline-block;padding:12px 20px;border-radius:6px;background-color:#18181b;color:#ffffff;font-weight:600;text-decoration:none;">${parts.action}</a></p>`,
    `<p style="margin:0 0 4px;color:#52525b;font-size:14px;">${parts.linkFallback}</p>`,
    `<p style="margin:0 0 24px;font-size:14px;word-break:break-all;"><a href="${parts.url}" style="color:#18181b;">${parts.url}</a></p>`,
    `<p style="margin:0 0 24px;color:#52525b;font-size:14px;">${parts.ignore}</p>`,
    `<p style="margin:0;color:#52525b;font-size:14px;">${parts.signature}</p>`,
    "</td></tr></table>",
    "</td></tr></table>",
    "</body>",
    "</html>",
  ].join("\n");

/** An account email in its reader's language. */
export const renderAuthEmail = (email: AuthEmail): RenderedEmail => {
  const catalog = catalogs[email.locale];
  const { messages, values } = contentOf(email, catalog);
  const inHtml = (template: string) => fill(template, values, escapeHtml);
  const inText = (template: string) => fill(template, values, keep);

  return {
    html: layout({
      action: inHtml(messages.action),
      body: inHtml(messages.body),
      ignore: inHtml(messages.ignore),
      linkFallback: escapeHtml(catalog.layout.linkFallback),
      locale: email.locale,
      signature: escapeHtml(catalog.layout.signature),
      url: escapeHtml(email.url),
    }),
    subject: inText(messages.subject),
    text: [
      inText(messages.body),
      fill(
        catalog.layout.textLink,
        new Map([
          ["action", inText(messages.action)],
          ["url", email.url],
        ]),
        keep
      ),
      inText(messages.ignore),
      catalog.layout.signature,
    ].join("\n\n"),
  };
};
