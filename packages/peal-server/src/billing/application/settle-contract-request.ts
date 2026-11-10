import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { BillingOff } from "#billing/domain/billing-off.ts";
import {
  appliedTo,
  changed,
  refusedBy,
} from "#billing/domain/contract-request.ts";
import type {
  ContractRequest,
  RequestIntent,
} from "#billing/domain/contract-request.ts";
import {
  acknowledgementsPerDay,
  acknowledgementWindow,
  acknowledgingPatience,
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

          // Kept before Stripe is asked anything, with the contract it is
          // for: taken up again, it is carried out as decided.
          const decided = (intent: RequestIntent) =>
            requests.save(
              changed(request, {
                intent: Option.some(intent),
                stripeSubscriptionId: Option.some(intent.stripeSubscriptionId),
                workspaceId: Option.some(workspaceId),
              })
            );

          if (request.kind === "cancellation") {
            return yield* cancellations
              .received({
                decided,
                desiredAt: request.desiredAt,
                intent: request.intent,
                receivedAt: request.receivedAt,
                requestId: request.id,
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
              decided,
              intent: request.intent,
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

          const claimed = yield* requests.claimAcknowledgement({
            at: now,
            email: request.email.value,
            id: request.id,
            limit: acknowledgementsPerDay,
            since: DateTime.subtractDuration(now, acknowledgementWindow),
          });

          if (!claimed) {
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
            // Nothing left: the address gets its acknowledgement back.
            yield* requests.save(request);

            // The mail will not take it: tried again by the sweep, for
            // `acknowledgingPatience`, then withheld, and a request that
            // needed its link left to staff.
            if (
              DateTime.isLessThan(
                now,
                DateTime.addDuration(request.receivedAt, acknowledgingPatience)
              )
            ) {
              return request;
            }

            const unsent = changed(request, {
              acknowledgement: "withheld",
              status:
                request.status === "awaitingConfirmation"
                  ? "unmatched"
                  : request.status,
            });

            yield* requests.save(unsent);
            yield* Effect.logError(
              "A contract request's acknowledgement could not be sent"
            ).pipe(Effect.annotateLogs({ requestId: request.id }));

            return unsent;
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
