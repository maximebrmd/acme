import { Match } from "effect";

import type { AuthEmail } from "./auth-email.ts";
import type { EmailCatalog, EmailMessages } from "./email-catalog.ts";
import {
  catalogs,
  escapeHtml,
  fill,
  instantIn,
  keep,
  layout,
  moneyIn,
} from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";

interface Content {
  readonly messages: EmailMessages;
  readonly values: ReadonlyMap<string, string>;
}

// A deletion's body, with what cancelling its subscriptions meant.
const withBilling = (
  messages: EmailMessages,
  subscriptionsCancelled: number,
  billingEnded: string
): EmailMessages =>
  subscriptionsCancelled > 0
    ? { ...messages, body: `${messages.body} ${billingEnded}` }
    : messages;

type Acknowledged = Extract<
  AuthEmail,
  { readonly _tag: "ContractRequestAcknowledged" }
>;

// A request's acknowledgement: when it came, what it said, what became of
// it.
const acknowledgementOf = (
  email: Acknowledged,
  { contractRequest: words }: EmailCatalog
): Content => {
  const { locale } = email;

  const body = [
    words.received[email.kind],
    words.content,
    ...(email.desiredAt === null ? [] : [words.desired]),
    words.outcomes[email.outcome],
    // A cancellation that gives money back: its plan had renewed since.
    ...(email.outcome === "cancelled" && email.refunded !== null
      ? [words.renewalRefunded]
      : []),
  ].join(" ");

  return {
    messages: {
      action:
        email.outcome === "confirm"
          ? words.actions.confirm
          : words.actions.open,
      body,
      ignore: words.ignore,
      subject: words.subjects[email.kind],
    },
    values: new Map([
      [
        "contract",
        email.contract === "" ? words.contractNotGiven : email.contract,
      ],
      [
        "desiredAt",
        email.desiredAt === null ? "" : instantIn(email.desiredAt, locale),
      ],
      [
        "effectiveAt",
        email.effectiveAt === null ? "" : instantIn(email.effectiveAt, locale),
      ],
      ["email", email.to],
      ["name", email.name],
      ["receivedAt", instantIn(email.receivedAt, locale)],
      [
        "refunded",
        email.refunded === null ? "" : moneyIn(email.refunded, locale),
      ],
    ]),
  };
};

const contentOf = (email: AuthEmail, catalog: EmailCatalog): Content =>
  Match.valueTags(email, {
    AccountDeleted: ({ subscriptionsCancelled }): Content => ({
      messages: withBilling(
        catalog.accountDeleted,
        subscriptionsCancelled,
        catalog.billingEnded.account
      ),
      values: new Map(),
    }),
    ContractRequestAcknowledged: (acknowledged): Content =>
      acknowledgementOf(acknowledged, catalog),
    DataExported: ({ via }): Content => ({
      messages: catalog.dataExported,
      values: new Map([["via", catalog.exportChannels[via]]]),
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
    WorkspaceDeleted: ({ subscriptionsCancelled, workspaceName }): Content => ({
      messages: withBilling(
        catalog.workspaceDeleted,
        subscriptionsCancelled,
        catalog.billingEnded.workspace
      ),
      values: new Map([["workspaceName", workspaceName]]),
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
