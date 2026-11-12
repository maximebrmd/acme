# Short links (shortlinks)

- The shortlinks context keeps, in its own schema, the short addresses
  publishing sends in place of a post's links (`shortlinks.links`), how
  many counted visits each had by UTC day (`shortlinks.clicks`) and each
  workspace's default (`shortlinks.settings`). A link is one per target,
  part and destination (a unique index), so every run of an attempt sends
  the same text; its code is 7 characters of `[0-9A-Za-z]`
  (`domain/short-code.ts`), drawn by `ShortCodes` (secure random, fair
  bytes only), drawn again on a collision, five times at most, then a
  defect. A code is not a secret.
- The feature is off unless `PEAL_SHORT_LINK_BASE` is set
  (`infrastructure/short-link-settings.ts`, read when the server starts:
  an absolute `https` address ending in `/`, `http` outside production;
  anything else stops the server). `ShortLinkBase` carries it; a short
  address is the base followed by the code.
- `ShortLinks.issue` checks no permission: publishing's adapter
  (`ShortLinksLinkShortener`) calls it once a post goes out, for the
  workspace. Only addresses `isShortenable` takes are stored (absolute
  `http`/`https`, 2,048 characters at most, no user or password, not on
  the base's host); any other is answered as written. Publishing keeps its
  own copy of that rule (`publishing/domain/short-links.ts`): keep them
  equal.
- `ShortLinks.follow` answers the redirect (`GET /api/l/:code`,
  `src/app/short-links/`): found, disabled or unknown. A visit counts
  (`domain/counted-visit.ts`) when it is a `GET` with a `User-Agent`
  naming no automated reader (`automatedReaderMarkers`) and no prefetch or
  preview (`Sec-Purpose`, `Purpose`): one upsert on the link's day. A
  count that cannot be kept never stops the redirect. Nothing about the
  visitor is kept, logged or put in a metric's labels: not the address,
  the `User-Agent` or the referrer. Never log or trace a destination.
- `ShortLinkReports` (analytics:read) lists a workspace's links newest
  first by cursor (UUIDv7), by post or channel, with their clicks over a
  range of UTC days (30 by default, 92 at most, `domain/click-range.ts`),
  and one link with its days. `ShortLinkSettings` reads the default with
  post:read and sets it with organization:update.
- Clicks are kept 400 days by day (`domain/click-retention.ts`, the daily
  `shortlinks.click-retention` cron at 04:53 UTC, the `shortLinkClicks`
  period of the data-processing registry and the privacy policy's table:
  change them together). `ShortLinkRecords` erases a workspace's links,
  clicks and default with it (the short addresses in its published posts
  then answer 404), and exports its links without counts.
- Tests count clicks in the 1890s, so the purge's cutoff touches no other
  suite's rows.
