import { Layer } from "effect";

import { ImpersonationAudit } from "#staff/application/impersonation-audit.ts";
import { LegalDisclosureAudit } from "#staff/application/legal-disclosure-audit.ts";
import { PurgeAuditLog } from "#staff/application/purge-audit-log.ts";
import { StaffActions } from "#staff/application/staff-actions.ts";
import { StaffConsole } from "#staff/application/staff-console.ts";
import { AccountsModeration } from "#staff/infrastructure/account-moderation.ts";
import { AccountStaffDirectory } from "#staff/infrastructure/account-staff-directory.ts";
import { ContextSystemHealth } from "#staff/infrastructure/context-system-health.ts";
import { ContextWorkspaceHealth } from "#staff/infrastructure/context-workspace-health.ts";
import { DrizzleAuditLog } from "#staff/infrastructure/drizzle-audit-log.ts";
import { DrizzleExpiredAuditEvents } from "#staff/infrastructure/drizzle-expired-audit-events.ts";

const AdaptersLive = Layer.mergeAll(
  AccountStaffDirectory,
  AccountsModeration,
  ContextSystemHealth,
  ContextWorkspaceHealth,
  DrizzleAuditLog,
  DrizzleExpiredAuditEvents
);

/**
 * The staff console's use cases: what it reads (StaffConsole) and what staff
 * do, recorded in the audit log (StaffActions), and the log's retention
 * (PurgeAuditLog). Needs the database (Drizzle
 * and SqlClient), Ids, and what the other contexts hand staff: the
 * workspace context's AccountDirectory and AccountModeration, billing's
 * WorkspaceEntitlements, the channels' ChannelOversight and publishing's
 * PostOversight, which the composition root brings.
 */
export const StaffLive = Layer.mergeAll(
  StaffActions.layer,
  StaffConsole.layer,
  PurgeAuditLog.layer
).pipe(Layer.provide(AdaptersLive));

/** The audit log's daily retention. Needs PurgeAuditLog. */
export { AuditRetentionCron as StaffCronsLive } from "#staff/infrastructure/crons.ts";

/**
 * The audit log of what staff do while acting as someone, for the workspace
 * context, which sees every request. Needs the database (Drizzle) and Ids.
 */
export const ImpersonationAuditLive = ImpersonationAudit.layer.pipe(
  Layer.provide(DrizzleAuditLog)
);

/**
 * The audit log's record of each legal request staff answer, for the legal
 * context. Needs the database (Drizzle) and Ids.
 */
export const LegalDisclosureAuditLive = LegalDisclosureAudit.layer.pipe(
  Layer.provide(DrizzleAuditLog)
);

/**
 * What the audit log keeps about a user, for the workspace context when
 * their account is closed. Needs the database (Drizzle).
 */
export { DrizzleStaffRecords as StaffRecordsLive } from "#staff/infrastructure/drizzle-audit-log.ts";

// The staff console's endpoints. They need the use cases StaffLive provides,
// and the StaffAccess middleware of the workspace context, which the
// composition root brings.
export { StaffHandlers as StaffApiLive } from "#staff/api/staff.ts";
