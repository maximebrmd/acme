import { Schema } from "effect";

import {
  UserIdSchema,
  Uuid7Schema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";

/** A billing account's id: a UUIDv7, as Peal issues them. */
export const BillingAccountIdSchema = Uuid7Schema.pipe(
  Schema.brand("BillingAccountId")
);

export type BillingAccountId = typeof BillingAccountIdSchema.Type;

/**
 * Who pays for a set of workspaces, which share its plan and count their
 * channels together: a person, for the workspaces they made (`payer`), or a
 * partner, for its home workspace and those it owns (`partnerId`); a
 * workspace nobody owns pays for itself (neither). Its billing workspace
 * (`holder`) carries the Stripe customer and the subscription. A
 * `standalone` account is one workspace a plan subscription of its own
 * keeps alone until it ends. `freeTier` false: staff required a payment
 * method.
 */
export class BillingAccount extends Schema.Class<BillingAccount>(
  "peal-server/billing/domain/BillingAccount"
)({
  createdAt: Schema.DateTimeUtc,
  freeTier: Schema.Boolean,
  holder: WorkspaceIdSchema,
  id: BillingAccountIdSchema,
  partnerId: Schema.Option(Uuid7Schema),
  payer: Schema.Option(UserIdSchema),
  standalone: Schema.Boolean,
}) {}
