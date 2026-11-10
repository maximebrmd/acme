import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { BillingOff } from "#billing/domain/billing-off.ts";
import { ContractRequestNotFound } from "#billing/domain/contract-request-not-found.ts";
import { ContractRequestSettled } from "#billing/domain/contract-request-settled.ts";
import { changed } from "#billing/domain/contract-request.ts";
import type {
  ContractRequest,
  ContractRequestId,
} from "#billing/domain/contract-request.ts";
import { requestBatch } from "#billing/domain/request-limits.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";

import { ContractRequests } from "./ports/contract-requests.ts";
import { RequestReview } from "./ports/request-review.ts";
import { SettleContractRequest } from "./settle-contract-request.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/** A staff member handling a request, and why. */
export interface Handling {
  readonly id: ContractRequestId;
  readonly reason: string;
  readonly staffId: UserId;
}

type Failure = ContractRequestNotFound | ContractRequestSettled | DatabaseError;

/**
 * The requests the form could not apply by itself, for staff: those no
 * contract was found for, and those whose sender has not followed their
 * link. Staff tie one to a workspace's contract (`apply`: as of the moment
 * it was received, and its sender is told what became of it), once they
 * know its sender holds that contract, or `close` it. Each is recorded in
 * the audit log before it is done, with ids only. Its callers are staff,
 * which the API's StaffAccess checked.
 */
export class ContractRequestDesk extends Context.Service<
  ContractRequestDesk,
  {
    readonly apply: (
      handling: Handling & { readonly workspaceId: WorkspaceId }
    ) => Effect.Effect<
      ContractRequest,
      BillingOff | Failure | StripeUnreachable
    >;
    readonly close: (
      handling: Handling
    ) => Effect.Effect<ContractRequest, Failure>;
    readonly open: Effect.Effect<readonly ContractRequest[], DatabaseError>;
  }
>()("peal-server/billing/application/ContractRequestDesk") {
  static readonly layer = Layer.effect(
    ContractRequestDesk,
    Effect.gen(function* ContractRequestDeskLive() {
      const requests = yield* ContractRequests;
      const review = yield* RequestReview;
      const settle = yield* SettleContractRequest;

      // The request, still open, with the action recorded.
      const recorded = Effect.fn("ContractRequestDesk.recorded")(
        function* recorded(
          { id, reason, staffId }: Handling,
          action: "apply" | "close",
          workspaceId: Option.Option<WorkspaceId>
        ) {
          const found = yield* requests.byId(id);

          if (Option.isNone(found)) {
            return yield* new ContractRequestNotFound();
          }

          const request = found.value;

          if (!request.open) {
            return yield* new ContractRequestSettled({
              status: request.status,
            });
          }

          const at = yield* DateTime.now;

          yield* review.handled({
            action,
            at,
            reason,
            requestId: id,
            staffId,
            userId: request.userId,
            workspaceId,
          });

          return { at, request };
        }
      );

      const apply = Effect.fn("ContractRequestDesk.apply")(function* apply(
        handling: Handling & { readonly workspaceId: WorkspaceId }
      ) {
        const { request } = yield* recorded(
          handling,
          "apply",
          Option.some(handling.workspaceId)
        );

        const done = yield* settle.apply(
          request,
          handling.workspaceId,
          Option.none()
        );

        // Told what became of it, whatever was sent before.
        return yield* settle.acknowledge(
          changed(done, { acknowledgement: "pending" })
        );
      });

      const close = Effect.fn("ContractRequestDesk.close")(function* close(
        handling: Handling
      ) {
        const { at, request } = yield* recorded(
          handling,
          "close",
          Option.none()
        );

        const closed = changed(request, {
          settledAt: Option.some(at),
          status: "closed",
        });

        yield* requests.save(closed);

        return closed;
      });

      return ContractRequestDesk.of({
        apply,
        close,
        open: requests.open(requestBatch),
      });
    })
  );
}
