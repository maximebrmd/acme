import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { BillingOff } from "#billing/domain/billing-off.ts";
import { ContractRequestNotFound } from "#billing/domain/contract-request-not-found.ts";
import type { ContractRequest } from "#billing/domain/contract-request.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PaidPlan } from "#shared/domain/plan.ts";

import { currentSubscription } from "./current-subscription.ts";
import { ContractHolders } from "./ports/contract-holders.ts";
import { ContractRequests } from "./ports/contract-requests.ts";
import { RequestTokens } from "./ports/request-tokens.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import { SettleContractRequest } from "./settle-contract-request.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** A contract the request's address manages. */
export interface HeldContract {
  /** When the period paid for ends, or the trial. */
  readonly periodEnd: Option.Option<DateTime.Utc>;
  readonly plan: PaidPlan;
  readonly trial: boolean;
  readonly workspaceId: WorkspaceId;
  readonly workspaceName: string;
}

/** What a link opens: the request, and the contracts it can apply to. */
export interface RequestPreview {
  readonly contracts: readonly HeldContract[];
  readonly request: ContractRequest;
}

type Failure = ContractRequestNotFound | DatabaseError;

/**
 * The link sent to a request's address, when that address manages a
 * contract and the request gave no contract number: whoever follows it
 * reads the mailbox, as they would to choose a new password, so they are
 * shown the contracts the address manages (`preview`), and the request is
 * applied to the one they choose (`confirm`), as of when it was received.
 * No session, no account. A link works once, for 30 days; anything else
 * finds nothing, without saying why.
 */
export class ConfirmContractRequest extends Context.Service<
  ConfirmContractRequest,
  {
    readonly confirm: (
      token: string,
      workspaceId: WorkspaceId
    ) => Effect.Effect<
      ContractRequest,
      BillingOff | Failure | StripeUnreachable
    >;
    readonly preview: (token: string) => Effect.Effect<RequestPreview, Failure>;
  }
>()("peal-server/billing/application/ConfirmContractRequest") {
  static readonly layer = Layer.effect(
    ConfirmContractRequest,
    Effect.gen(function* ConfirmContractRequestLive() {
      const requests = yield* ContractRequests;
      const holders = yield* ContractHolders;
      const tokens = yield* RequestTokens;
      const settle = yield* SettleContractRequest;
      const context = yield* Effect.context<Subscriptions>();

      const preview = Effect.fn("ConfirmContractRequest.preview")(
        function* preview(token: string) {
          const now = yield* DateTime.now;

          const found = yield* requests.byConfirmation(
            yield* tokens.digestOf(token),
            now
          );

          if (Option.isNone(found) || Option.isNone(found.value.userId)) {
            return yield* new ContractRequestNotFound();
          }

          const request = found.value;
          const holder = yield* holders.byId(found.value.userId.value);

          const contracts = yield* Effect.forEach(
            Option.match(holder, {
              onNone: () => [],
              onSome: ({ workspaces }) => workspaces,
            }),
            ({ id, name }) =>
              currentSubscription(id).pipe(
                Effect.map(
                  Option.map((subscription): HeldContract => ({
                    periodEnd:
                      subscription.status === "trialing"
                        ? subscription.trialEnd
                        : subscription.currentPeriodEnd,
                    plan: subscription.plan,
                    trial: subscription.status === "trialing",
                    workspaceId: id,
                    workspaceName: name,
                  }))
                )
              )
          );

          const shown: RequestPreview = {
            contracts: contracts.flatMap((contract) =>
              Option.toArray(contract)
            ),
            request,
          };

          return shown;
        },
        Effect.provide(context)
      );

      const confirm = Effect.fn("ConfirmContractRequest.confirm")(
        function* confirm(token: string, workspaceId: WorkspaceId) {
          const { contracts, request } = yield* preview(token);

          if (
            !contracts.some((contract) => contract.workspaceId === workspaceId)
          ) {
            return yield* new ContractRequestNotFound();
          }

          return yield* settle.apply(request, workspaceId, Option.none());
        }
      );

      return ConfirmContractRequest.of({ confirm, preview });
    })
  );
}
