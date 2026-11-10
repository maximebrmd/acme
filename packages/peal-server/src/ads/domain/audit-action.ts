import { Schema } from "effect";

/**
 * What the ads audit trail records: every decision about money, and every
 * change to a boost, with who made it. Stored: add one, never rename one.
 */
export const AuditActionSchema = Schema.Literals([
  "accountConnected",
  "accountDisconnected",
  "spendingEnabled",
  "spendingDisabled",
  "ceilingChanged",
  "boostRequested",
  "boostStarted",
  "boostUnconfirmed",
  "boostFailed",
  "boostPaused",
  "boostResumed",
  "boostStopped",
  "boostEnded",
]);

export type AuditAction = typeof AuditActionSchema.Type;
