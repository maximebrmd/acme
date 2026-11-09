import { Layer } from "effect";

import { LegalRequests } from "#legal/application/legal-requests.ts";
import { PurgeLegalRecords } from "#legal/application/purge-legal-records.ts";
import { DrizzleLegalStore } from "#legal/infrastructure/drizzle-legal-store.ts";
import { LegalRecordsLive } from "#legal/infrastructure/legal-records-live.ts";

/**
 * What the law has Peal keep so that whoever contributed content can be
 * identified: answering legal requests (LegalRequests), the daily
 * retention (PurgeLegalRecords), and, for the workspace context, which
 * closes accounts and sees each request, keeping a closed account's
 * identity and each connection that made content (LegalRecords), unless
 * `PEAL_LEGAL_RETENTION` is `false`. Needs the
 * database (Drizzle), a TransactionRunner and Ids.
 */
export const LegalLive = Layer.mergeAll(
  LegalRecordsLive,
  LegalRequests.layer,
  PurgeLegalRecords.layer
).pipe(Layer.provide(DrizzleLegalStore));

/** The legal records' daily retention. Needs PurgeLegalRecords. */
export { LegalRetentionCron as LegalCronsLive } from "#legal/infrastructure/crons.ts";

// The legal requests endpoint. It needs LegalRequests, which LegalLive
// provides, and the StaffAccess middleware of the workspace context, which
// the composition root brings.
export { LegalHandlers as LegalApiLive } from "#legal/api/legal.ts";
