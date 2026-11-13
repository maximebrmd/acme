import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { BillingAccountId } from "#billing/domain/billing-account.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

/** What a staff member did to a billing account, and why. */
export interface HandledAccount {
  readonly action:
    | "detach"
    | "merge"
    | "requirePaymentMethod"
    | "restoreFreeTier";
  /** The account acted on: the one merged, for a merge. */
  readonly accountId: BillingAccountId;
  readonly at: DateTime.Utc;
  /** The account merged into, for a merge. */
  readonly intoAccountId: Option.Option<BillingAccountId>;
  /** Why, in the staff member's words. */
  readonly reason: string;
  readonly staffId: UserId;
  /** The workspace detached, for a detachment. */
  readonly workspaceId: Option.Option<WorkspaceId>;
  /** The workspaces a merge moved. */
  readonly moved?: readonly WorkspaceId[];
}

/**
 * Where what staff do to billing accounts is recorded, before it is done:
 * the staff context's audit log. Ids only.
 */
export class AccountDeskAudit extends Context.Service<
  AccountDeskAudit,
  {
    readonly handled: (
      handled: HandledAccount
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/AccountDeskAudit") {}
