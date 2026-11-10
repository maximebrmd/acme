import { Effect } from "effect";
import type { SqlClient, Statement } from "effect/sql";

import { failed } from "./rows.ts";

/**
 * The advisory lock `AccountStore.spendingOn` holds on an ad account: what
 * counts, reserves or checks what its boosts commit takes it.
 */
export const spendingLockName = "peal-server/ads/spending";

// Locks, until the transaction ends, the accounts the subquery lists, in
// the order of their ids, so two callers never wait on each other.
const lockAll = (client: SqlClient.SqlClient, ids: Statement.Fragment) =>
  client`SELECT pg_advisory_xact_lock(hashtext(${spendingLockName}), hashtext(id::text)) FROM (${ids} ORDER BY id) AS locked`.pipe(
    Effect.mapError(failed),
    Effect.asVoid
  );

/**
 * Takes the spending lock of every ad account of the workspace, until the
 * transaction it runs in ends: an erasure then waits for a boost being
 * counted or checked, and the boost sees the erasure after it.
 */
export const lockWorkspaceSpending = (
  client: SqlClient.SqlClient,
  workspaceId: string
) =>
  lockAll(
    client,
    client`SELECT id FROM ads.accounts WHERE workspace_id = ${workspaceId}`
  );

/**
 * Takes the spending lock of every ad account a Meta user's sign-ins
 * connect, until the transaction it runs in ends.
 */
export const lockUserSpending = (
  client: SqlClient.SqlClient,
  platformUserId: string
) =>
  lockAll(
    client,
    client`SELECT id FROM ads.accounts WHERE grant_id IN (SELECT id FROM ads.grants WHERE network = 'meta' AND platform_user_id = ${platformUserId})`
  );
