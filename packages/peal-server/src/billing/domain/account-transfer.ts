import { Duration, Schema } from "effect";

import {
  UserIdSchema,
  Uuid7Schema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

import { BillingAccountIdSchema } from "./billing-account.ts";

/** How long an offer to take over a workspace's billing stays open. */
export const transferLifetime = Duration.days(7);

export const AccountTransferIdSchema = Uuid7Schema.pipe(
  Schema.brand("AccountTransferId")
);

export type AccountTransferId = typeof AccountTransferIdSchema.Type;

/**
 * A workspace its payer offered to another of its owners, who becomes its
 * payer by accepting, in person, before `expiresAt`.
 */
export class AccountTransfer extends Schema.Class<AccountTransfer>(
  "peal-server/billing/domain/AccountTransfer"
)({
  expiresAt: Schema.DateTimeUtc,
  fromAccountId: BillingAccountIdSchema,
  id: AccountTransferIdSchema,
  offeredAt: Schema.DateTimeUtc,
  offeredBy: UserIdSchema,
  toUserId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}
