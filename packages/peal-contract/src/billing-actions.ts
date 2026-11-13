import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { AlreadySubscribed } from "./already-subscribed.ts";
import { Authentication } from "./authentication.ts";
import { BilledElsewhere } from "./billed-elsewhere.ts";
import { BillingNotEnabled } from "./billing-not-enabled.ts";
import { BillingUnavailable } from "./billing-unavailable.ts";
import {
  BillingAccountSchema,
  BillingTransferSchema,
  CancellationSchema,
  CancelPayloadSchema,
  OrderPayloadSchema,
  OrderSchema,
  ReductionPayloadSchema,
  ReductionSchema,
  TransferPayloadSchema,
  WithdrawalPreviewSchema,
  WithdrawalSchema,
} from "./billing.ts";
import { ConsentChanged } from "./consent-changed.ts";
import { DesiredDayTooFar } from "./desired-day-too-far.ts";
import { Forbidden } from "./forbidden.ts";
import { NothingToCancel } from "./nothing-to-cancel.ts";
import { PlanLimitReached } from "./plan-limit-reached.ts";
import { PlanNotSold } from "./plan-not-sold.ts";
import { PlanTooSmall } from "./plan-too-small.ts";
import { ReductionRefused } from "./reduction-refused.ts";
import { TransferNotFound } from "./transfer-not-found.ts";
import { TransferRefused } from "./transfer-refused.ts";
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
        AlreadySubscribed,
        BilledElsewhere,
        ConsentChanged,
        BillingNotEnabled,
        BillingUnavailable,
        Forbidden,
        PlanNotSold,
        PlanTooSmall,
        TrialUnavailable,
      ],
      params: workspaceParams,
      payload: OrderPayloadSchema,
      success: OrderSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Records the order a checkout then needs: `payAsYouGo`, monthly, the only plan sold (each connected account past the free ones and each use past its allowance, billed each month for the month past), and the member's request to start now, knowing their right to withdraw. Another plan or a yearly interval is refused (PlanNotSold), and no trial is offered (TrialUnavailable, `notOffered`). A billing account that already holds `payAsYouGo`, even past due or unpaid, orders nothing more (AlreadySubscribed). An order without a `consentVersion`, or whose `consentVersion` is not the server's, is refused (ConsentChanged). Ordering during a trial or on an older plan ends that one once the new subscription is recorded. A workspace whose billing account another of its workspaces bills orders nothing: the plan is ordered there (BilledElsewhere).",
        summary: "Order a plan",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("cancel", "/cancellation", {
      error: [
        BillingNotEnabled,
        BillingUnavailable,
        DesiredDayTooFar,
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
  .add(
    HttpApiEndpoint.post("reduce", "/reduction", {
      error: [BillingNotEnabled, Forbidden, ReductionRefused],
      params: workspaceParams,
      payload: ReductionPayloadSchema,
      success: ReductionSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Brings a workspace over its plan back within it by keeping what the member chose: the other channels are disconnected, as each would be one at a time (the platforms that take it are asked to forget Peal), the other members are removed, and the pending invitations revoked. Only what is over the plan is touched. The whole choice is checked first: refused, it changes nothing. Posts scheduled on a channel disconnected fail when due. Needs billing:manage, channel:disconnect, member:delete and invitation:cancel.",
        summary: "Choose what stays in a workspace over its plan",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("offerTransfer", "/transfer", {
      error: [BillingNotEnabled, Forbidden, TransferRefused],
      params: workspaceParams,
      payload: TransferPayloadSchema,
      success: BillingTransferSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Offers the workspace to another of its owners, who becomes its payer by accepting within 7 days: the workspace then moves to their billing account, made if they have none. Only the workspace's payer offers it; an offer made again replaces the one before.",
        summary: "Offer the workspace to another payer",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("acceptTransfer", "/transfer/acceptance", {
      error: [
        BillingNotEnabled,
        Forbidden,
        PlanLimitReached,
        TransferNotFound,
        TransferRefused,
      ],
      params: workspaceParams,
      success: BillingAccountSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Takes over the workspace's billing, as the owner it was offered to: the workspace moves to your billing account, made if you have none, and counts its channels with your other workspaces'. Refused when your account's plan has no room for its channels (PlanLimitReached), and while the workspace bills its account with a subscription Stripe may still charge (TransferRefused `subscribed`).",
        summary: "Take over the workspace's billing",
      })
    )
  )
  .add(
    HttpApiEndpoint.delete("withdrawTransfer", "/transfer", {
      error: [BillingNotEnabled, Forbidden, TransferNotFound],
      params: workspaceParams,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Withdraws the open offer, as the payer who made it, or declines it, as the owner it was made to.",
        summary: "Withdraw the offer of the workspace",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/billing") {}
