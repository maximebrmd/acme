import { Option, Schema } from "effect";
import type { DateTime } from "effect";

import {
  UserIdSchema,
  Uuid7Schema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { LocaleSchema } from "#shared/domain/locale.ts";

import { MoneySchema } from "./billing-notice.ts";
import type { Money } from "./billing-notice.ts";

/** A request's id: a lowercase UUIDv7. */
export const ContractRequestIdSchema = Uuid7Schema.pipe(
  Schema.brand("ContractRequestId")
);

export type ContractRequestId = typeof ContractRequestIdSchema.Type;

/**
 * What a customer asks of their contract: to cancel it (Code de la
 * consommation L215-1-1), or, as a consumer within 14 days of it, to
 * withdraw from it (L221-18; Directive 2011/83/EU art. 11a).
 */
export const ContractRequestKindSchema = Schema.Literals([
  "cancellation",
  "withdrawal",
]);

export type ContractRequestKind = typeof ContractRequestKindSchema.Type;

/**
 * How a request came: from a member who manages billing, in their own
 * session, or from the form anyone reaches without signing in.
 */
export const ContractRequestChannelSchema = Schema.Literals([
  "session",
  "form",
]);

export type ContractRequestChannel = typeof ContractRequestChannelSchema.Type;

/**
 * Where a request stands:
 *
 * - `received`: recorded, not looked at yet;
 * - `awaitingConfirmation`: its email address manages a contract's billing,
 *   but nothing in it shows its sender holds that contract: the link sent
 *   to the address applies it;
 * - `unmatched`: no contract found for it: staff look at it;
 * - `applied`: the contract was cancelled or withdrawn from, as of the day
 *   the request was received;
 * - `refused`: it found its contract, which could not be cancelled or
 *   withdrawn from (`refusal` says why);
 * - `closed`: staff closed it without applying it.
 */
export const ContractRequestStatusSchema = Schema.Literals([
  "received",
  "awaitingConfirmation",
  "unmatched",
  "applied",
  "refused",
  "closed",
]);

export type ContractRequestStatus = typeof ContractRequestStatusSchema.Type;

/**
 * Why a request that found its contract was not applied: the subscription
 * was already cancelled or over (`nothingToCancel`), or could not be
 * withdrawn from (`notSubscribed`; `expired`, its 14 days were over when
 * the request came; `business`, its customer buys with a verified VAT
 * number).
 */
export const ContractRequestRefusalSchema = Schema.Literals([
  "nothingToCancel",
  "notSubscribed",
  "expired",
  "business",
]);

export type ContractRequestRefusal = typeof ContractRequestRefusalSchema.Type;

/**
 * Whether the request's sender was sent the acknowledgement of its receipt:
 * `none` for a member in session, whom the notices tell; `pending` until
 * the email left; `sent`; or `withheld`, when its address was sent too many
 * already that day.
 */
export const AcknowledgementSchema = Schema.Literals([
  "none",
  "pending",
  "sent",
  "withheld",
]);

export type Acknowledgement = typeof AcknowledgementSchema.Type;

/** The longest name or contract a request holds. */
export const maxRequestTextLength = 100;

// Letters, digits, spaces and the punctuation names hold: nothing a link
// or an address is written with, as the acknowledgement quotes them to an
// address nobody checked.
const quotable = /^[\p{L}\p{M}\p{N} '’,&()-]+$/u;

/**
 * What a person writes in the form to say who they are, or which contract
 * they mean: trimmed, 100 characters at most, and nothing a link is made
 * of.
 */
export const RequestTextSchema = Schema.Trim.check(
  Schema.isNonEmpty(),
  Schema.isMaxLength(maxRequestTextLength),
  Schema.isPattern(quotable)
);

/** The longest email address a request holds. */
export const maxRequestEmailLength = 254;

/** An email address, as the form takes it: trimmed, with one `@`. */
export const RequestEmailSchema = Schema.Trim.check(
  Schema.isMaxLength(maxRequestEmailLength),
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u)
);

/**
 * A request to cancel a contract or withdraw from it, with when it was
 * received, which is the day that counts whenever it is applied, what its
 * sender wrote to identify themselves and the contract (a form's), the
 * contract it was tied to, and what became of it. The proof of what the
 * customer asked and when: kept with the contract's orders.
 */
export class ContractRequest extends Schema.Class<ContractRequest>(
  "peal-server/billing/domain/ContractRequest"
)({
  // When the acknowledgement left, once `sent`.
  acknowledgedAt: Schema.Option(Schema.DateTimeUtc),
  acknowledgement: AcknowledgementSchema,
  channel: ContractRequestChannelSchema,
  // The contract as its sender named it: its number, or its workspace.
  contract: Schema.Option(Schema.String),
  // When its sender wants the contract to end, for a cancellation, if
  // they said.
  desiredAt: Schema.Option(Schema.DateTimeUtc),
  // When the contract ends, once applied.
  effectiveAt: Schema.Option(Schema.DateTimeUtc),
  // Where the acknowledgement goes.
  email: Schema.Option(Schema.String),
  id: ContractRequestIdSchema,
  kind: ContractRequestKindSchema,
  // The language of the page it was sent from.
  locale: LocaleSchema,
  name: Schema.Option(Schema.String),
  receivedAt: Schema.DateTimeUtc,
  // What goes back to the customer, once applied.
  refunded: Schema.Option(MoneySchema),
  refusal: Schema.Option(ContractRequestRefusalSchema),
  // When it was applied, refused or closed.
  settledAt: Schema.Option(Schema.DateTimeUtc),
  status: ContractRequestStatusSchema,
  stripeSubscriptionId: Schema.Option(Schema.NonEmptyString),
  // The member who sent it, or the account its address signs in to.
  userId: Schema.Option(UserIdSchema),
  workspaceId: Schema.Option(WorkspaceIdSchema),
}) {
  /** Whether it still waits for its sender or for staff. */
  get open(): boolean {
    return (
      this.status === "received" ||
      this.status === "awaitingConfirmation" ||
      this.status === "unmatched"
    );
  }
}

/** A request's fields, as its constructor takes them. */
export type ContractRequestFields = ConstructorParameters<
  typeof ContractRequest
>[0];

/** The request, with some of its fields changed. */
export const changed = (
  request: ContractRequest,
  changes: Partial<ContractRequestFields>
): ContractRequest =>
  new ContractRequest({
    acknowledgedAt: request.acknowledgedAt,
    acknowledgement: request.acknowledgement,
    channel: request.channel,
    contract: request.contract,
    desiredAt: request.desiredAt,
    effectiveAt: request.effectiveAt,
    email: request.email,
    id: request.id,
    kind: request.kind,
    locale: request.locale,
    name: request.name,
    receivedAt: request.receivedAt,
    refunded: request.refunded,
    refusal: request.refusal,
    settledAt: request.settledAt,
    status: request.status,
    stripeSubscriptionId: request.stripeSubscriptionId,
    userId: request.userId,
    workspaceId: request.workspaceId,
    ...changes,
  });

/**
 * The contract a request was tied to: a workspace's, and its subscription
 * when it has one.
 */
export interface TiedContract {
  readonly stripeSubscriptionId: Option.Option<string>;
  readonly workspaceId: WorkspaceId;
}

/** The request, applied to its contract at `settledAt`. */
export const appliedTo = (
  request: ContractRequest,
  contract: TiedContract,
  outcome: {
    readonly effectiveAt: DateTime.Utc;
    readonly refunded: Option.Option<Money>;
    readonly settledAt: DateTime.Utc;
  }
): ContractRequest =>
  changed(request, {
    effectiveAt: Option.some(outcome.effectiveAt),
    refunded: outcome.refunded,
    refusal: Option.none(),
    settledAt: Option.some(outcome.settledAt),
    status: "applied",
    stripeSubscriptionId: contract.stripeSubscriptionId,
    workspaceId: Option.some(contract.workspaceId),
  });

/** The request, refused by its contract at `settledAt`. */
export const refusedBy = (
  request: ContractRequest,
  contract: TiedContract,
  refusal: ContractRequestRefusal,
  settledAt: DateTime.Utc
): ContractRequest =>
  changed(request, {
    refusal: Option.some(refusal),
    settledAt: Option.some(settledAt),
    status: "refused",
    stripeSubscriptionId: contract.stripeSubscriptionId,
    workspaceId: Option.some(contract.workspaceId),
  });
