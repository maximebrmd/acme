import { DateTime, Match, Option } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

import type { EmailCatalog, EmailMessages } from "./email-catalog.ts";
import { catalogs, escapeHtml, fill, keep, layout } from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";
import type {
  NoticeChannel,
  NoticeEvent,
  NoticeExcess,
  NoticeMoney,
} from "./notice-event.ts";

/** A notice for one reader, as an email. */
export interface NoticeEmail {
  readonly event: NoticeEvent;
  readonly locale: Locale;
  /** The page the email links to, in the reader's language. */
  readonly url: string;
  readonly workspaceName: string;
}

// Readers' time zones are not known: instants are written in UTC, and say so.
const instantIn = (instant: DateTime.Utc, locale: Locale): string =>
  `${DateTime.format(instant, {
    dateStyle: "long",
    locale,
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;

// An amount in its currency, as the reader writes money.
const moneyIn = ({ amount, currency }: NoticeMoney, locale: Locale): string =>
  new Intl.NumberFormat(locale, {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100);

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

interface Content {
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
    SubscriptionRenewing: ({ plan, price, renewsAt }): Content => ({
      messages: catalog.subscriptionRenewing,
      values: [
        ["plan", catalog.plans[plan]],
        ["price", moneyIn(price, locale)],
        ["renewsAt", instantIn(renewsAt, locale)],
      ],
    }),
    SubscriptionStarted: ({
      interval,
      plan,
      price,
      startedAt,
      trialEnd,
    }): Content =>
      Option.match(trialEnd, {
        onNone: (): Content => ({
          messages: catalog.subscriptionStarted,
          values: [
            ["interval", catalog.intervals[interval]],
            ["plan", catalog.plans[plan]],
            ["price", moneyIn(price, locale)],
            ["startedAt", instantIn(startedAt, locale)],
          ],
        }),
        onSome: (endsAt): Content => ({
          messages: catalog.trialStarted,
          values: [
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
  });

/** A notice, in its reader's language. */
export const renderNoticeEmail = (email: NoticeEmail): RenderedEmail => {
  const catalog = catalogs[email.locale];

  const { messages, values: own } = contentOf(
    email.event,
    catalog,
    email.locale
  );

  const values: ReadonlyMap<string, string> = new Map([
    ...own,
    ["workspaceName", email.workspaceName],
  ]);

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
