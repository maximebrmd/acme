import { DateTime, Option } from "effect";
import type {
  ShortLink as ShortLinkView,
  ShortLinkStatus,
} from "peal-contract";

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
