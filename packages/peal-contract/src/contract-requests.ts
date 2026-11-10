import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { BillingNotEnabled } from "./billing-not-enabled.ts";
import { MoneySchema, PaidPlanSchema } from "./billing-plans.ts";
import { BillingUnavailable } from "./billing-unavailable.ts";
import { ContractRequestIntake } from "./contract-request-intake.ts";
import { ContractRequestNotFound } from "./contract-request-not-found.ts";

/**
 * What a customer asks of their contract: to cancel it, or, as a consumer
 * within 14 days of it, to withdraw from it.
 */
export const ContractRequestKindSchema = Schema.Literals([
  "cancellation",
  "withdrawal",
]).annotate({ identifier: "ContractRequestKind" });

export type ContractRequestKind = typeof ContractRequestKindSchema.Type;

/** The longest name or contract a request holds, in characters. */
export const maxContractRequestText = 100;

/** The longest email address a request holds. */
export const maxContractRequestEmail = 254;

/**
 * What the form's name and contract may be written with: letters, digits,
 * spaces and the punctuation names hold. Nothing a link or an address is
 * made of, as the acknowledgement quotes them.
 */
export const contractRequestTextPattern = /^[\p{L}\p{M}\p{N} '’,&()-]+$/u;

const RequestTextSchema = Schema.Trim.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxContractRequestText),
  Schema.isPattern(contractRequestTextPattern, {
    description: "letters, digits, spaces and ' ’ , & ( ) -",
  })
);

const RequestEmailSchema = Schema.Trim.check(
  Schema.isMaxLength(maxContractRequestEmail),
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u, {
    description: "an email address",
  })
);

/** A calendar day, as `2026-12-31`. */
export const ContractDaySchema = Schema.String.check(
  Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u, {
    description: "a day, as YYYY-MM-DD",
  })
).annotate({ identifier: "ContractDay" });

/**
 * A request to cancel a contract or withdraw from it, as the form anyone
 * reaches sends it: what French law lets a trader ask (Code de la
 * consommation D215-2 and D221-5), and nothing else.
 */
export const NewContractRequestSchema = Schema.Struct({
  // The contract: its number, from the subscription's confirmation, or
  // the workspace's name. With the number, the request is applied at once.
  contract: Schema.NullOr(RequestTextSchema),
  // For a cancellation, the day the contract should end (UTC), if later
  // than the period paid for; null is as soon as the contract allows.
  desiredOn: Schema.NullOr(ContractDaySchema),
  // Where the acknowledgement goes.
  email: RequestEmailSchema,
  kind: ContractRequestKindSchema,
  // The language of the acknowledgement.
  locale: Schema.Literals(["en", "fr"]),
  // First and last name, or the company's.
  name: RequestTextSchema,
}).annotate({ identifier: "NewContractRequest" });

export type NewContractRequest = typeof NewContractRequestSchema.Type;

/** That a request was received, and when: the moment that counts. */
export const ContractRequestReceiptSchema = Schema.Struct({
  receivedAt: Schema.DateTimeUtc,
}).annotate({ identifier: "ContractRequestReceipt" });

export type ContractRequestReceipt = typeof ContractRequestReceiptSchema.Type;

/** Whether this server has the functions, and what their form needs. */
export const ContractFunctionsSchema = Schema.Struct({
  // False on a server that does not bill: it has no contract to end.
  enabled: Schema.Boolean,
  // The Turnstile site key the form shows its widget with, or null.
  turnstileSiteKey: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ContractFunctions" });

export type ContractFunctions = typeof ContractFunctionsSchema.Type;

/**
 * Where a request stands: `received`, not looked at yet;
 * `awaitingConfirmation`, the link sent to its address applies it;
 * `unmatched`, no contract found, staff look at it; `applied`; `refused`
 * by its contract; `closed` by staff.
 */
export const ContractRequestStatusSchema = Schema.Literals([
  "received",
  "awaitingConfirmation",
  "unmatched",
  "applied",
  "refused",
  "closed",
]).annotate({ identifier: "ContractRequestStatus" });

export type ContractRequestStatus = typeof ContractRequestStatusSchema.Type;

/**
 * Why a contract refused a request: nothing left to cancel
 * (`nothingToCancel`), no subscription to withdraw from (`notSubscribed`),
 * the 14 days were over when it came (`expired`), or the customer is a
 * business with a verified VAT number (`business`).
 */
export const ContractRequestRefusalSchema = Schema.Literals([
  "nothingToCancel",
  "notSubscribed",
  "expired",
  "business",
]).annotate({ identifier: "ContractRequestRefusal" });

export type ContractRequestRefusal = typeof ContractRequestRefusalSchema.Type;

/** A contract the address a link was sent to manages. */
export const HeldContractSchema = Schema.Struct({
  // When the period paid for ends, or the trial.
  periodEnd: Schema.NullOr(Schema.DateTimeUtc),
  plan: PaidPlanSchema,
  trial: Schema.Boolean,
  workspaceId: Schema.String,
  workspaceName: Schema.String,
}).annotate({ identifier: "HeldContract" });

export type HeldContract = typeof HeldContractSchema.Type;

/** What a link opens: the request, and the contracts it can apply to. */
export const ContractRequestPreviewSchema = Schema.Struct({
  contracts: Schema.Array(HeldContractSchema),
  desiredOn: Schema.NullOr(Schema.DateTimeUtc),
  kind: ContractRequestKindSchema,
  receivedAt: Schema.DateTimeUtc,
}).annotate({ identifier: "ContractRequestPreview" });

export type ContractRequestPreview = typeof ContractRequestPreviewSchema.Type;

/** What became of a request that was applied to a contract. */
export const ContractRequestOutcomeSchema = Schema.Struct({
  // When the contract ends, once applied.
  effectiveAt: Schema.NullOr(Schema.DateTimeUtc),
  kind: ContractRequestKindSchema,
  receivedAt: Schema.DateTimeUtc,
  // What goes back to the customer.
  refunded: Schema.NullOr(MoneySchema),
  refusal: Schema.NullOr(ContractRequestRefusalSchema),
  status: ContractRequestStatusSchema,
}).annotate({ identifier: "ContractRequestOutcome" });

export type ContractRequestOutcome = typeof ContractRequestOutcomeSchema.Type;

const TokenSchema = Schema.String.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(200)
);

/**
 * The functions to cancel a contract and to withdraw from one, for anyone,
 * without signing in (Code de la consommation L215-1-1 and L221-21;
 * Directive 2011/83/EU art. 11a). A request is recorded with the moment it
 * came, which is the one that counts, and acknowledged by email; the
 * answer never tells whether its address has an account or a contract.
 * Members who manage billing, signed in, use `BillingActionsApi` instead,
 * which applies at once.
 */
export class ContractRequestsApi extends HttpApiGroup.make("contractRequests")
  .add(
    HttpApiEndpoint.get("functions", "/functions", {
      success: ContractFunctionsSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Tells whether this server sells subscriptions, so has contracts to cancel or withdraw from, and the Turnstile site key the form shows its widget with, if it asks for one. Needs no credentials.",
        summary: "Get the contract functions' settings",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("send", "/", {
      error: BillingNotEnabled,
      payload: NewContractRequestSchema,
      success: ContractRequestReceiptSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Records a request to cancel a contract, or to withdraw from it within 14 days, and acknowledges it by email to the address given, with when it came and what it said. With the contract's number, it is applied at once; with the address of an account that manages a contract, the email holds a link that applies it; otherwise a person looks at it. Whenever it is applied, it is as of `receivedAt`. Each address may send 5 an hour; on a server with Turnstile, send the widget's token in `x-captcha-response`.",
        summary: "Send a request to cancel or withdraw",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("preview", "/confirmation/preview", {
      error: ContractRequestNotFound,
      payload: Schema.Struct({ token: TokenSchema }),
      success: ContractRequestPreviewSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "What the link sent to a request's address opens: the request, and the contracts that address manages, to choose the one it applies to.",
        summary: "Open a request's link",
      })
    )
  )
  .add(
    HttpApiEndpoint.post("confirm", "/confirmation", {
      error: [BillingNotEnabled, BillingUnavailable, ContractRequestNotFound],
      payload: Schema.Struct({
        token: TokenSchema,
        workspaceId: Schema.String,
      }),
      success: ContractRequestOutcomeSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Applies the request a link opens to one of the contracts its address manages, as of the moment the request was received. A link works once.",
        summary: "Apply a request from its link",
      })
    )
  )
  .middleware(ContractRequestIntake)
  .prefix("/api/contract-requests") {}
