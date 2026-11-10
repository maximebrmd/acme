import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { BillingNotEnabled } from "./billing-not-enabled.ts";
import { BillingUnavailable } from "./billing-unavailable.ts";
import {
  CancellationSchema,
  CancelPayloadSchema,
  OrderPayloadSchema,
  OrderSchema,
  WithdrawalPreviewSchema,
  WithdrawalSchema,
} from "./billing.ts";
import { Forbidden } from "./forbidden.ts";
import { NothingToCancel } from "./nothing-to-cancel.ts";
import { TrialUnavailable } from "./trial-unavailable.ts";
import { WithdrawalUnavailable } from "./withdrawal-unavailable.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

const workspaceParams = { workspaceId: Schema.String };

/**
 * Ordering, cancelling and withdrawing, for members with billing:manage in
 * their own session only: never an API key, an OAuth client, nor staff
 * impersonating them (403). Checkout itself is Better Auth's
 * `/api/auth/subscription/upgrade`, which needs an order placed here in the
 * last 30 minutes, named in its `metadata.orderId`.
 */
export class BillingActionsApi extends HttpApiGroup.make("billingActions")
  .add(
    HttpApiEndpoint.post("order", "/orders", {
      error: [
        BillingNotEnabled,
        BillingUnavailable,
        Forbidden,
        TrialUnavailable,
      ],
      params: workspaceParams,
      payload: OrderPayloadSchema,
      success: OrderSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Records the order a checkout then needs: the plan and interval, or the trial, and the member's request to start now, knowing their right to withdraw. Ordering a paid plan during the trial ends the trial at once, without charge.",
        summary: "Order a plan",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("cancel", "/cancellation", {
      error: [
        BillingNotEnabled,
        BillingUnavailable,
        Forbidden,
        NothingToCancel,
      ],
      params: workspaceParams,
      payload: CancelPayloadSchema,
      success: CancellationSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Cancels the subscription: a paid one ends when its period does, without further charge, or on `desiredOn` when that is later, the last period then charged only up to that day; a trial ends now. The members who manage billing are told by email.",
        summary: "Cancel the subscription",
      })
    )
  )
  .add(
    HttpApiEndpoint.get("withdrawal", "/withdrawal", {
      error: [
        BillingNotEnabled,
        BillingUnavailable,
        Forbidden,
        WithdrawalUnavailable,
      ],
      params: workspaceParams,
      success: WithdrawalPreviewSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "What withdrawing from the contract would do now: until when it is possible and what would be refunded.",
        summary: "Preview a withdrawal",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("withdraw", "/withdrawal", {
      error: [
        BillingNotEnabled,
        BillingUnavailable,
        Forbidden,
        WithdrawalUnavailable,
      ],
      params: workspaceParams,
      success: WithdrawalSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Withdraws from the contract within 14 days of it, as a consumer may: the subscription ends now and the rest of the period is refunded within 14 days. The members who manage billing get an acknowledgement by email.",
        summary: "Withdraw from the contract",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/billing") {}
