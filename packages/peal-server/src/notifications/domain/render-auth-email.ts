import { Match } from "effect";

import type { AuthEmail } from "./auth-email.ts";
import type { EmailCatalog, EmailMessages } from "./email-catalog.ts";
import { catalogs, escapeHtml, fill, keep, layout } from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";

interface Content {
  readonly messages: EmailMessages;
  readonly values: ReadonlyMap<string, string>;
}

const contentOf = (email: AuthEmail, catalog: EmailCatalog): Content =>
  Match.valueTags(email, {
    AccountDeleted: (): Content => ({
      messages: catalog.accountDeleted,
      values: new Map(),
    }),
    Invitation: (invitation): Content => {
      const roles: ReadonlyMap<string, string> = new Map(
        Object.entries(catalog.roles)
      );

      return {
        messages: catalog.invitation,
        values: new Map([
          ["inviterName", invitation.inviterName],
          ["role", roles.get(invitation.role) ?? invitation.role],
          ["workspaceName", invitation.workspaceName],
        ]),
      };
    },
    ResetPassword: (): Content => ({
      messages: catalog.resetPassword,
      values: new Map(),
    }),
    VerifyEmail: (): Content => ({
      messages: catalog.verifyEmail,
      values: new Map(),
    }),
  });

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
