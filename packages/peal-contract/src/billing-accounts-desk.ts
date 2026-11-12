import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  OpenApi,
} from "effect/http-api";

import { AccountsNotMerged } from "./accounts-not-merged.ts";
import { BillingAccountNotFound } from "./billing-account-not-found.ts";
import { PlatformSchema } from "./platform.ts";
import { StaffAccess } from "./staff-access.ts";
import { StaffReasonSchema } from "./staff.ts";

/** A billing account, as staff see it: ids and counts only. */
export const StaffBillingAccountSchema = Schema.Struct({
  // The workspace that bills it.
  billingWorkspaceId: Schema.String,
  // False once staff required a payment method: its free tier is none.
  freeTier: Schema.Boolean,
  id: Schema.String,
  partnerId: Schema.NullOr(Schema.String),
  // The person who pays for it, null for a partner's.
  payerUserId: Schema.NullOr(Schema.String),
  // A workspace a plan subscription of its own keeps alone.
  standalone: Schema.Boolean,
  // Whether its billing workspace's subscription gives it a plan now.
  subscribed: Schema.Boolean,
  workspaceIds: Schema.Array(Schema.String),
}).annotate({ identifier: "StaffBillingAccount" });

export type StaffBillingAccount = typeof StaffBillingAccountSchema.Type;

/** A platform account connected under several free billing accounts. */
export const SharedPlatformAccountSchema = Schema.Struct({
  // The free billing accounts it is connected under, with how many of
  // their workspaces hold it.
  accounts: Schema.Array(
    Schema.Struct({ accountId: Schema.String, workspaces: Schema.Int })
  ),
  // The account's own id on the platform, as its channels keep it.
  platform: PlatformSchema,
  platformAccountId: Schema.String,
}).annotate({ identifier: "SharedPlatformAccount" });

export type SharedPlatformAccount = typeof SharedPlatformAccountSchema.Type;

/** A page of platform accounts under several free billing accounts. */
export const SharedPlatformAccountPageSchema = Schema.Struct({
  items: Schema.Array(SharedPlatformAccountSchema),
  // Where the next page starts; null after the last.
  next: Schema.NullOr(Schema.String),
}).annotate({ identifier: "SharedPlatformAccountPage" });

export type SharedPlatformAccountPage =
  typeof SharedPlatformAccountPageSchema.Type;

/**
 * What staff do about one free tier per person: the platform accounts
 * connected under several free billing accounts, the one cheap signal of
 * free tiers multiplied; merging one account into another, which
 * transfers undo; and requiring a payment method of an account, which
 * takes its free tier away, and its undo. Each action is in the audit log,
 * by id only. It answers 404 to anyone but staff in their own session.
 */
export class BillingAccountsDeskApi extends HttpApiGroup.make(
  "billingAccountsDesk"
)
  .add(
    HttpApiEndpoint.get("sharedChannels", "/billing/shared-channels", {
      // A cursor no page gave.
      error: HttpApiError.BadRequest,
      query: {
        after: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.Int.check(Schema.isBetween({ maximum: 100, minimum: 1 }))
        ),
      },
      success: SharedPlatformAccountPageSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "The platform accounts connected in workspaces of two or more billing accounts without a subscription, with those accounts' ids and how many of their workspaces hold each, by platform then id, 50 a page by default. A page may hold fewer than asked, none included: follow `next` until it is null.",
        summary: "List platform accounts under several free accounts",
      })
    )
  )
  .add(
    HttpApiEndpoint.get("account", "/billing/accounts", {
      error: BillingAccountNotFound,
      query: {
        accountId: Schema.optionalKey(Schema.String),
        workspaceId: Schema.optionalKey(Schema.String),
      },
      success: StaffBillingAccountSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "The billing account with this id, or that holds this workspace.",
        summary: "Get a billing account",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("merge", "/billing/accounts/merge", {
      error: [AccountsNotMerged, BillingAccountNotFound],
      payload: Schema.Struct({
        fromAccountId: Schema.String,
        intoAccountId: Schema.String,
        reason: StaffReasonSchema,
      }),
      success: StaffBillingAccountSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Moves every workspace of one billing account into another, which then counts their channels with its own, and deletes the first: its payer offers each back by transfer to undo it. Refused while the first holds a subscription Stripe may still charge. Recorded in the audit log first.",
        summary: "Merge one billing account into another",
      })
    )
  )
  .add(
    HttpApiEndpoint.post(
      "requirePaymentMethod",
      "/billing/accounts/payment-method",
      {
        error: BillingAccountNotFound,
        payload: Schema.Struct({
          accountId: Schema.String,
          reason: StaffReasonSchema,
          // True takes the account's free tier away; false gives it back.
          required: Schema.Boolean,
        }),
        success: StaffBillingAccountSchema,
      }
    ).annotateMerge(
      OpenApi.annotations({
        description:
          "Requires a payment method of the account, which then has no free tier, or gives its free tier back (`required: false`). Recorded in the audit log first.",
        summary: "Require a payment method of a billing account",
      })
    )
  )
  .middleware(StaffAccess)
  .prefix("/api/admin") {}
