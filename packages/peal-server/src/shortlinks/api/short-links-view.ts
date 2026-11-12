import { DateTime, Option } from "effect";
import type {
  ShortLinkPage,
  ShortLinkReport,
  ShortLink as ShortLinkView,
  ShortLinkStatus,
} from "peal-contract";

import type {
  LinkDays,
  LinkReport,
} from "#shortlinks/application/short-link-reports.ts";
import type { ShortLinkStatus as Status } from "#shortlinks/application/short-link-settings.ts";
import type { ClickRange } from "#shortlinks/domain/click-range.ts";
import type { ShortLink } from "#shortlinks/domain/short-link.ts";

/** A day (UTC) as the contract writes it. */
export const dayView = (day: DateTime.Utc): string =>
  DateTime.formatIsoDateUtc(day);

export const periodView = (range: ClickRange) => ({
  from: dayView(range.from),
  to: dayView(range.to),
});

export const statusView = (status: Status): ShortLinkStatus => ({
  available: status.available,
  base: Option.getOrNull(status.base),
  byDefault: status.byDefault,
  shortLength: Option.getOrNull(status.shortLength),
});

export const linkView = (
  link: ShortLink,
  clicks: number,
  base: Option.Option<string>
): ShortLinkView => ({
  channelId: link.channelId,
  clicks,
  createdAt: link.createdAt,
  destination: link.destination,
  disabled: Option.isSome(link.disabledAt),
  id: link.id,
  part: link.part,
  postId: link.postId,
  shortUrl: base.pipe(
    Option.map((written) => `${written}${link.code}`),
    Option.getOrNull
  ),
  targetId: link.targetId,
});

/** A page of links, as the API answers it. */
export const pageView = (
  report: LinkReport,
  base: Option.Option<string>
): ShortLinkPage => ({
  items: report.links.map(({ clicks, link }) => linkView(link, clicks, base)),
  nextCursor: Option.getOrNull(report.next),
  period: periodView(report.range),
});

/** One link with its days, as the API answers it. */
export const reportView = (
  report: LinkDays,
  base: Option.Option<string>
): ShortLinkReport => {
  let total = 0;

  for (const { clicks } of report.days) {
    total += clicks;
  }

  return {
    days: report.days.map(({ clicks, day }) => ({
      clicks,
      day: dayView(day),
    })),
    link: linkView(report.link, total, base),
    period: periodView(report.range),
  };
};
