import type { SqlClient } from "effect/sql";

// Following posts and erasing workspaces take turns on one transaction
// advisory lock, in its two-key form: the first key names what it guards.
// Erasures share it, so they never wait on each other; following a batch
// of posts holds it alone, so it never runs beside an erasure not yet
// committed, and sees every one committed before it.

/** Taken by an erasure, until its transaction ends. */
export const shareTrackingLock = (sql: SqlClient.SqlClient) =>
  sql`SELECT pg_advisory_xact_lock_shared(hashtext('acme-server/analytics/tracking'), 0)`;

/** Taken by following posts, until its transaction ends. */
export const holdTrackingLock = (sql: SqlClient.SqlClient) =>
  sql`SELECT pg_advisory_xact_lock(hashtext('acme-server/analytics/tracking'), 0)`;
