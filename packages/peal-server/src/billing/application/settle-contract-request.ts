import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { BillingOff } from "#billing/domain/billing-off.ts";
import {
  appliedTo,
  changed,
  refusedBy,
} from "#billing/domain/contract-request.ts";
import type { ContractRequest } from "#billing/domain/contract-request.ts";
import {
  acknowledgementsPerDay,
  acknowledgementWindow,
  confirmationLifetime,
} from "#billing/domain/request-limits.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { CancelSubscription } from "./cancel-subscription.ts";
import { ContractRequests } from "./ports/contract-requests.ts";
import { RequestMail } from "./ports/request-mail.ts";
import { RequestTokens } from "./ports/request-tokens.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";
import { Withdraw } from "./withdraw.ts";

/**
 * What ends a request: applying it to a workspace's contract, as of the
 * moment it was received, and acknowledging it to the address its sender
 * gave. Shared by the form, the link sent to the address, and staff.
 */
export class SettleContractRequest extends Context.Service<
  SettleContractRequest,
  {
    /**
     * Sends the acknowledgement, and keeps whether it left. An address
     * sent `acknowledgementsPerDay` already is not written to: a request
     * that needed its link is then left to staff.
     */
    readonly acknowledge: (
      request: ContractRequest
    ) => Effect.Effect<ContractRequest, DatabaseError>;
    /**
     * Cancels the workspace's contract, or withdraws from it, as the
     * request asks and as of when it came, and keeps what became of it:
     * applied, or refused by the contract. `named` is the subscription the
     * request's contract number names, when it gave one. Stripe not
     * answering leaves the request as it was.
     */
    readonly apply: (
      request: ContractRequest,
      workspaceId: WorkspaceId,
      named: Option.Option<string>
    ) => Effect.Effect<
      ContractRequest,
      BillingOff | DatabaseError | StripeUnreachable
    >;
  }
>()("peal-server/billing/application/SettleContractRequest") {
  static readonly layer = Layer.effect(
    SettleContractRequest,
    Effect.gen(function* SettleContractRequestLive() {
      const requests = yield* ContractRequests;
      const cancellations = yield* CancelSubscription;
      const withdrawals = yield* Withdraw;
      const mail = yield* RequestMail;
      const tokens = yield* RequestTokens;

      const settled = Effect.fn("SettleContractRequest.settled")(
        function* settled(
          request: ContractRequest,
          workspaceId: WorkspaceId,
          named: Option.Option<string>
        ) {
          const now = yield* DateTime.now;
          const contract = { stripeSubscriptionId: named, workspaceId };

          if (request.kind === "cancellation") {
            return yield* cancellations
              .received({
                desiredAt: request.desiredAt,
                receivedAt: request.receivedAt,
                stripeSubscriptionId: named,
                workspaceId,
              })
              .pipe(
                Effect.map((done) =>
                  appliedTo(
                    request,
                    {
                      stripeSubscriptionId: Option.some(
                        done.stripeSubscriptionId
                      ),
                      workspaceId,
                    },
                    {
                      effectiveAt: done.endsAt,
                      refunded: done.refunded,
                      settledAt: now,
                    }
                  )
                ),
                Effect.catchTag("NothingToCancel", () =>
                  Effect.succeed(
                    refusedBy(request, contract, "nothingToCancel", now)
                  )
                )
              );
          }

          return yield* withdrawals
            .received({
              receivedAt: request.receivedAt,
              stripeSubscriptionId: named,
              userId: request.userId,
              workspaceId,
            })
            .pipe(
              Effect.map((done) =>
                appliedTo(
                  request,
                  {
                    stripeSubscriptionId: Option.some(
                      done.stripeSubscriptionId
                    ),
                    workspaceId,
                  },
                  {
                    effectiveAt: done.withdrawnAt,
                    refunded: Option.some(done.refunded),
                    settledAt: now,
                  }
                )
              ),
              Effect.catchTag("WithdrawalUnavailable", ({ reason }) =>
                Effect.succeed(refusedBy(request, contract, reason, now))
              )
            );
        }
      );

      const apply = Effect.fn("SettleContractRequest.apply")(function* apply(
        request: ContractRequest,
        workspaceId: WorkspaceId,
        named: Option.Option<string>
      ) {
        const done = yield* settled(request, workspaceId, named);

        yield* requests.save(done);

        yield* Effect.logInfo("Settled a contract request").pipe(
          Effect.annotateLogs({
            kind: done.kind,
            requestId: done.id,
            status: done.status,
            workspaceId,
          })
        );

        return done;
      });

      const acknowledge = Effect.fn("SettleContractRequest.acknowledge")(
        function* acknowledge(request: ContractRequest) {
          if (
            Option.isNone(request.email) ||
            request.acknowledgement === "sent" ||
            request.acknowledgement === "none"
          ) {
            return request;
          }

          const now = yield* DateTime.now;

          const before = yield* requests.acknowledgedTo(
            request.email.value,
            DateTime.subtractDuration(now, acknowledgementWindow)
          );

          if (before >= acknowledgementsPerDay) {
            // Without its link, only staff can apply it.
            const withheld = changed(request, {
              acknowledgement: "withheld",
              status:
                request.status === "awaitingConfirmation"
                  ? "unmatched"
                  : request.status,
            });

            yield* requests.save(withheld);

            return withheld;
          }

          let token = Option.none<string>();

          if (request.status === "awaitingConfirmation") {
            const issued = yield* tokens.issue;

            yield* requests.setConfirmation(
              request.id,
              issued.digest,
              DateTime.addDuration(now, confirmationLifetime)
            );

            token = Option.some(issued.token);
          }

          if (!(yield* mail.acknowledge(request, token))) {
            return request;
          }

          const sent = changed(request, {
            acknowledgedAt: Option.some(now),
            acknowledgement: "sent",
          });

          yield* requests.save(sent);

          return sent;
        }
      );

      return SettleContractRequest.of({ acknowledge, apply });
    })
  );
}
