import { Layer } from "effect";

import { LegalRequests } from "#legal/application/legal-requests.ts";
import { PurgeLegalRecords } from "#legal/application/purge-legal-records.ts";
import { AuditDisclosureReview } from "#legal/infrastructure/audit-disclosure-review.ts";
import { DrizzleLegalStore } from "#legal/infrastructure/drizzle-legal-store.ts";
import { LegalRecordsLive } from "#legal/infrastructure/legal-records-live.ts";
import { StaffLegalOfficers } from "#legal/infrastructure/staff-legal-officers.ts";

/**
 * What French law has some hosts keep so that whoever contributed content
 * can be identified: the daily retention (PurgeLegalRecords), which runs
 * whatever the setting, so what a server kept ends at its term once it is
 * turned off; and, for the workspace context, which closes accounts and
 * sees each request, keeping a closed account's identity and each
 * connection that made content (LegalRecords), only when
 * `PEAL_LEGAL_RETENTION` is `true`. Needs the database (Drizzle), a
 * TransactionRunner and Ids.
 */
export const LegalLive = Layer.mergeAll(
  LegalRecordsLive,
  PurgeLegalRecords.layer
).pipe(Layer.provide(DrizzleLegalStore));

/**
 * Answering legal requests (LegalRequests), for staff holding the legal
 * role, which the workspace context's StaffStanding tells, each answer
 * shown in the staff context's audit log (LegalDisclosureAudit). Needs the
 * database (Drizzle), a TransactionRunner and Ids, with those two, which
 * the composition root brings.
 */
export const LegalRequestsLive = LegalRequests.layer.pipe(
  Layer.provide(
    Layer.mergeAll(DrizzleLegalStore, StaffLegalOfficers, AuditDisclosureReview)
  )
);

/** The legal records' daily retention. Needs PurgeLegalRecords. */
export { LegalRetentionCron as LegalCronsLive } from "#legal/infrastructure/crons.ts";

// The legal requests endpoint. It needs LegalRequests, which
// LegalRequestsLive provides, and the StaffAccess middleware of the workspace context, which
// the composition root brings.
export { LegalHandlers as LegalApiLive } from "#legal/api/legal.ts";
