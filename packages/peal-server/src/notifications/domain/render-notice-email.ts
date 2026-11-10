import { Match, Option } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

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
import type {
  NoticeChannel,
  NoticeEvent,
  NoticeExcess,
} from "./notice-event.ts";

/** A notice for one reader, as an email. */
export interface NoticeEmail {
  readonly event: NoticeEvent;
  readonly locale: Locale;
  /** The page the email links to, in the reader's language. */
  readonly url: string;
  readonly workspaceName: string;
}

const platformName = (catalog: EmailCatalog, channel: NoticeChannel) =>
  catalog.platforms[channel.platform] ?? channel.platform;

// The account, by its platform and handle, or as a disconnected channel.
const channelPhrase = (
  catalog: EmailCatalog,
  channel: Option.Option<NoticeChannel>
): string =>
  Option.match(channel, {
    onNone: () => catalog.unknownChannel,
    onSome: (known) =>
      fill(
        catalog.channel,
        new Map([
          ["handle", known.handle],
          ["platform", platformName(catalog, known)],
        ]),
        keep
      ),
  });

const gigabyte = 1_000_000_000;

// Bytes in the decimal units the plans are sold in, as the reader writes
// numbers.
const sizeIn = (bytes: number, locale: Locale): string =>
  bytes >= gigabyte
    ? new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        style: "unit",
        unit: "gigabyte",
      }).format(bytes / gigabyte)
    : new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
        style: "unit",
        unit: "megabyte",
      }).format(bytes / 1_000_000);

// What a workspace holds beyond the free plan, each against what the plan
// allows, or that it holds nothing beyond it.
const standingIn = (
  catalog: EmailCatalog,
  over: readonly NoticeExcess[],
  locale: Locale
): string => {
  if (over.length === 0) {
    return catalog.withinFreePlan;
  }

  const amount = (limit: NoticeExcess["limit"], count: number) =>
    limit === "mediaStorage" ? sizeIn(count, locale) : String(count);

  const listed = over.map(({ allowed, limit, used }) =>
    fill(
      catalog.excess[limit],
      new Map([
        ["allowed", amount(limit, allowed)],
        ["used", amount(limit, used)],
      ]),
      keep
    )
  );

  return fill(
    catalog.overFreePlan,
    new Map([["over", listed.join(", ")]]),
    keep
  );
};

// The body, with what the contract's number is for once it has one.
const numbered = (
  messages: EmailMessages,
  catalog: EmailCatalog,
  reference: string | undefined
): EmailMessages =>
  reference === undefined
    ? messages
    : { ...messages, body: `${messages.body} ${catalog.contractNumber}` };

interface Content {
  /** What the email sets apart in a box, if anything. */
  readonly highlight?: string;
  readonly messages: EmailMessages;
  readonly values: readonly (readonly [string, string])[];
}

const contentOf = (
  event: NoticeEvent,
  catalog: EmailCatalog,
  locale: Locale
): Content =>
  Match.valueTags(event, {
    ChannelReconnectRequired: ({ channel }): Content => ({
      messages: catalog.channelReconnectRequired,
      values: [
        ["handle", channel.handle],
        ["platform", platformName(catalog, channel)],
      ],
    }),
    ChannelReconnectSoon: ({ channel, expiresAt }): Content => ({
      messages: catalog.channelReconnectSoon,
      values: [
        ["expiresAt", instantIn(expiresAt, locale)],
        ["handle", channel.handle],
        ["platform", platformName(catalog, channel)],
      ],
    }),
    CommentsReceived: ({ count }): Content => ({
      messages: catalog.commentsReceived,
      values: [["count", String(count)]],
    }),
    PostApprovalRequested: ({ scheduledAt }): Content => ({
      messages: catalog.postApprovalRequested,
      values: [["scheduledAt", instantIn(scheduledAt, locale)]],
    }),
    PostApproved: ({ by, late }): Content => ({
      messages: late ? catalog.postApprovedLate : catalog.postApproved,
      values: [["by", catalog.reviewParties[by]]],
    }),
    PostChangesRequested: ({ by }): Content => ({
      messages: catalog.postChangesRequested,
      values: [["by", catalog.reviewParties[by]]],
    }),
    PostCommented: ({ by }): Content => ({
      messages: catalog.postCommented,
      values: [["by", catalog.reviewParties[by]]],
    }),
    PostFailed: ({ channel, reason }): Content => ({
      messages: catalog.postFailed,
      values: [
        ["channel", channelPhrase(catalog, channel)],
        ["reason", catalog.failureReasons[reason]],
      ],
    }),
    PostPublished: ({ channel }): Content => ({
      messages: catalog.postPublished,
      values: [["channel", channelPhrase(catalog, channel)]],
    }),
    PostUnconfirmed: ({ channel }): Content => ({
      messages: catalog.postUnconfirmed,
      values: [["channel", channelPhrase(catalog, channel)]],
    }),
    SubscriptionCancelled: ({ endsAt, plan }): Content => ({
      messages: catalog.subscriptionCancelled,
      values: [
        ["endsAt", instantIn(endsAt, locale)],
        ["plan", catalog.plans[plan]],
      ],
    }),
    SubscriptionRenewing: ({ plan, price, reference, renewsAt }): Content => ({
      highlight: catalog.renewalDeadline,
      messages: numbered(catalog.subscriptionRenewing, catalog, reference),
      values: [
        ["plan", catalog.plans[plan]],
        ["price", moneyIn(price, locale)],
        ["reference", reference ?? ""],
        ["renewsAt", instantIn(renewsAt, locale)],
      ],
    }),
    SubscriptionStarted: ({
      interval,
      plan,
      price,
      reference,
      startedAt,
      trialEnd,
    }): Content =>
      Option.match(trialEnd, {
        onNone: (): Content => ({
          messages: numbered(catalog.subscriptionStarted, catalog, reference),
          values: [
            ["reference", reference ?? ""],
            ["interval", catalog.intervals[interval]],
            ["plan", catalog.plans[plan]],
            ["price", moneyIn(price, locale)],
            ["startedAt", instantIn(startedAt, locale)],
          ],
        }),
        onSome: (endsAt): Content => ({
          messages: numbered(catalog.trialStarted, catalog, reference),
          values: [
            ["reference", reference ?? ""],
            ["endsAt", instantIn(endsAt, locale)],
            ["plan", catalog.plans[plan]],
            ["price", moneyIn(price, locale)],
            ["startedAt", instantIn(startedAt, locale)],
          ],
        }),
      }),
    SubscriptionWithdrawn: ({ plan, refunded, withdrawnAt }): Content => ({
      messages: catalog.subscriptionWithdrawn,
      values: [
        ["plan", catalog.plans[plan]],
        ["refunded", moneyIn(refunded, locale)],
        ["withdrawnAt", instantIn(withdrawnAt, locale)],
      ],
    }),
    TrialEnding: ({ endsAt, over, plan }): Content => ({
      messages: catalog.trialEnding,
      values: [
        ["endsAt", instantIn(endsAt, locale)],
        ["plan", catalog.plans[plan]],
        ["standing", standingIn(catalog, over, locale)],
      ],
    }),
    WebhookEndpointDisabled: ({ host, reason }): Content => ({
      messages: catalog.webhookEndpointDisabled,
      values: [
        ["host", host],
        ["reason", catalog.webhookTurnOffReasons[reason]],
      ],
    }),
  });

/** A notice, in its reader's language. */
export const renderNoticeEmail = (email: NoticeEmail): RenderedEmail => {
  const catalog = catalogs[email.locale];

  const {
    highlight,
    messages,
    values: own,
  } = contentOf(email.event, catalog, email.locale);

  const values: ReadonlyMap<string, string> = new Map([
    ...own,
    ["workspaceName", email.workspaceName],
  ]);

  const inHtml = (template: string) => fill(template, values, escapeHtml);
  const inText = (template: string) => fill(template, values, keep);

  const parts = {
    action: inHtml(messages.action),
    body: inHtml(messages.body),
    ignore: inHtml(messages.ignore),
    linkFallback: escapeHtml(catalog.layout.linkFallback),
    locale: email.locale,
    signature: escapeHtml(catalog.layout.signature),
    url: escapeHtml(email.url),
  };

  return {
    html: layout(
      highlight === undefined
        ? parts
        : { ...parts, highlight: inHtml(highlight) }
    ),
    subject: inText(messages.subject),
    text: [
      inText(messages.body),
      ...(highlight === undefined ? [] : [inText(highlight)]),
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
