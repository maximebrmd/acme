import { DateTime, Match, Option } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

import type { EmailCatalog, EmailMessages } from "./email-catalog.ts";
import { catalogs, escapeHtml, fill, keep, layout } from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";
import type { NoticeChannel, NoticeEvent } from "./notice-event.ts";

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
