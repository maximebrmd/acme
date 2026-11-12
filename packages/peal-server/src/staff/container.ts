import { Layer } from "effect";

import { ContractRequestAudit } from "#staff/application/contract-request-audit.ts";
import { ImpersonationAudit } from "#staff/application/impersonation-audit.ts";
import { LegalDisclosureAudit } from "#staff/application/legal-disclosure-audit.ts";
import { PurgeAuditLog } from "#staff/application/purge-audit-log.ts";
import { StaffActions } from "#staff/application/staff-actions.ts";
import { StaffConsole } from "#staff/application/staff-console.ts";
import { StaffPartners } from "#staff/application/staff-partners.ts";
import { StaffShortLinks } from "#staff/application/staff-short-links.ts";
import { AccountsModeration } from "#staff/infrastructure/account-moderation.ts";
import { AccountStaffDirectory } from "#staff/infrastructure/account-staff-directory.ts";
import { ContextSystemHealth } from "#staff/infrastructure/context-system-health.ts";
import { ContextWorkspaceHealth } from "#staff/infrastructure/context-workspace-health.ts";
import { DrizzleAuditLog } from "#staff/infrastructure/drizzle-audit-log.ts";
import { DrizzleExpiredAuditEvents } from "#staff/infrastructure/drizzle-expired-audit-events.ts";
import { ShortLinksDesk } from "#staff/infrastructure/short-links-desk.ts";
import { WorkspacePartnerDesk } from "#staff/infrastructure/workspace-partner-desk.ts";

const AdaptersLive = Layer.mergeAll(
  AccountStaffDirectory,
  AccountsModeration,
  ContextSystemHealth,
  ContextWorkspaceHealth,
  DrizzleAuditLog,
  DrizzleExpiredAuditEvents,
  ShortLinksDesk,
  WorkspacePartnerDesk
);

/**
 * The staff console's use cases: what it reads (StaffConsole) and what staff
 * do, recorded in the audit log (StaffActions, and StaffPartners for the
 * partner accounts they grant, StaffShortLinks for the short links they
 * turn off), and the log's retention
 * (PurgeAuditLog). Needs the database (Drizzle
 * and SqlClient), Ids, and what the other contexts hand staff: the
 * workspace context's AccountDirectory, AccountModeration, PartnerAccounts
 * and PartnerOwnership, billing's
 * WorkspaceEntitlements, the channels' ChannelOversight, publishing's
 * PostOversight and the shortlinks context's ShortLinkModeration, which
 * the composition root brings.
 */
export const StaffLive = Layer.mergeAll(
  StaffActions.layer,
  StaffConsole.layer,
  StaffPartners.layer,
  StaffShortLinks.layer,
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
 * The audit log's record of each request to cancel or withdraw that staff
 * apply or close, for the billing context. Needs the database (Drizzle)
 * and Ids.
 */
export const ContractRequestAuditLive = ContractRequestAudit.layer.pipe(
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
