import { DateTime } from "effect";

import type { Locale } from "#shared/domain/locale.ts";

import type { ChannelNotice } from "./channel-notice.ts";
import { catalogs, escapeHtml, fill, keep, layout } from "./email-layout.ts";
import type { RenderedEmail } from "./email-layout.ts";

/** A channel notice for one reader. */
export interface ChannelEmail {
  readonly locale: Locale;
  readonly notice: ChannelNotice;
  /** Where the workspace's channels are, in the reader's language. */
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

/** A channel notice, in its reader's language. */
export const renderChannelEmail = (email: ChannelEmail): RenderedEmail => {
  const catalog = catalogs[email.locale];
  const { notice } = email;

  const messages =
    notice._tag === "ChannelReconnectRequired"
      ? catalog.channelReconnectRequired
      : catalog.channelReconnectSoon;

  const values: ReadonlyMap<string, string> = new Map([
    ["handle", notice.handle],
    ["platform", catalog.platforms[notice.platform] ?? notice.platform],
    ["workspaceName", email.workspaceName],
    ...(notice._tag === "ChannelReconnectSoon"
      ? [["expiresAt", instantIn(notice.expiresAt, email.locale)] as const]
      : []),
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
