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
  post:read and sets it with organization:update; `defaultFor`, without
  a permission and false without a base, is what publishing's
  `ShortLinksShortLinkDefaults` reads for each new post that does not
  say. It comes alone as `ShortLinkSettingsLive`, which the composition
  root gives publishing: `ShortLinksLive` needs publishing through
  `LinkStanding`.
- Clicks are kept 400 days by day (`domain/click-retention.ts`, the daily
  `shortlinks.click-retention` cron at 04:53 UTC, the `shortLinkClicks`
  period of the data-processing registry and the privacy policy's table:
  change them together). `ShortLinkRecords` erases a workspace's links,
  clicks and default with it (the short addresses in its published posts
  then answer 404), and exports its links without counts.
- Tests count clicks in the 1890s, so the purge's cutoff touches no other
  suite's rows.
- Staff turn a link off or on again (`ShortLinkModeration`, for the staff
  context's `StaffShortLinks` through its `ShortLinkDesk` port): the
  staff use case records `disableShortLink` or `enableShortLink` in the
  audit log, with the link's workspace and its code, before it asks. A
  link turned off (`disabled_at`) answers 410 and counts nothing.
- A link redirects only while the part of the post that holds it is live
  on its platform (publishing's `LiveTargetParts`: a live part, not taken
  down), 404 otherwise, so a post that never goes out leaves no working
  link; and only while its workspace is in good standing (the workspace
  context's `WorkspaceStanding`: it exists, and not every account that
  owns it is banned), 410 otherwise. Both through `LinkStanding`, which
  `ContextLinkStanding` backs at the composition root; tests take
  `OpenLinkStanding` (`test/shortlinks/support.ts`).
- Staff list a workspace's links and turn every one still on off at once
  (`disableWorkspaceShortLinks`, recorded once, with how many).
- A destination is stored and redirected to as `URL.href` writes it
  (ASCII: punycode host, percent-encoded path), 2,048 characters at most
  so written (`destinationOf`, the same rule in publishing's domain and
  the contract's `post-text`); a value no header can carry answers 404,
  never a redirect that throws. The redirect has no server span
  (`UntracedPathsLive`, `src/app/untraced-paths.ts`): the HTTP tracer would keep the
  visitor's browser and address.
