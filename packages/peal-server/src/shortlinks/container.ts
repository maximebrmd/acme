import { Layer } from "effect";

import { PurgeClicks } from "#shortlinks/application/purge-clicks.ts";
import { ShortLinkModeration } from "#shortlinks/application/short-link-moderation.ts";
import { ShortLinkRecords } from "#shortlinks/application/short-link-records.ts";
import { ShortLinkReports } from "#shortlinks/application/short-link-reports.ts";
import { ShortLinkSettings } from "#shortlinks/application/short-link-settings.ts";
import { ShortLinks } from "#shortlinks/application/short-links.ts";
import { DrizzleShortLinkStore } from "#shortlinks/infrastructure/drizzle-short-link-store.ts";
import { RandomShortCodes } from "#shortlinks/infrastructure/random-short-codes.ts";
import { ShortLinkBaseLive } from "#shortlinks/infrastructure/short-link-settings.ts";

/**
 * Short links: issued when a post goes out (ShortLinks), followed by
 * anyone, read by the workspace (ShortLinkReports, ShortLinkSettings),
 * erased and exported with it (ShortLinkRecords), turned off by staff
 * (ShortLinkModeration), and their clicks' daily
 * retention (PurgeClicks). Reads `PEAL_SHORT_LINK_BASE` when it is built.
 * Needs the database (Drizzle, SqlClient), Ids, and LinkStanding, which
 * `ContextLinkStanding` backs with publishing's LiveTargetParts and the
 * workspace context's WorkspaceStanding at the composition root.
 */
export const ShortLinksLive = Layer.mergeAll(
  ShortLinks.layer,
  ShortLinkReports.layer,
  ShortLinkSettings.layer,
  ShortLinkRecords.layer,
  ShortLinkModeration.layer,
  PurgeClicks.layer
).pipe(
  Layer.provideMerge(ShortLinkBaseLive),
  Layer.provide(Layer.mergeAll(DrizzleShortLinkStore, RandomShortCodes))
);

/** The clicks' daily retention. Needs PurgeClicks. */
export { ClickRetentionCron as ShortLinksCronsLive } from "#shortlinks/infrastructure/crons.ts";

// The short links' endpoints. They need ShortLinkReports, ShortLinkSettings
// and ShortLinkBase, which ShortLinksLive provides, and the middlewares of
// the workspace context, which the composition root brings.
export { ShortLinksHandlers as ShortLinksApiLive } from "#shortlinks/api/short-links.ts";

/** LinkStanding, on publishing's and the workspace context's use cases. */
export { ContextLinkStanding as LinkStandingLive } from "#shortlinks/infrastructure/context-link-standing.ts";
