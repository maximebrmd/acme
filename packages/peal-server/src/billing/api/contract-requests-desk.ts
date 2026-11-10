import { Effect, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  BillingNotEnabled,
  BillingUnavailable,
  ContractRequestNotFound,
  ContractRequestSettled,
  CurrentStaff,
} from "peal-contract";

import { ContractRequestDesk } from "#billing/application/contract-request-desk.ts";
import { ContractRequestIdSchema } from "#billing/domain/contract-request.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";

import { openRequestView, outcomeView } from "./contract-request-view.ts";

const decodeRequestId = Schema.decodeUnknownOption(ContractRequestIdSchema);

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

const notFound = () => Effect.fail(new ContractRequestNotFound());

const settled = ({ status }: { readonly status: string }) =>
  Effect.fail(new ContractRequestSettled({ status }));

/**
 * The requests that wait for staff, behind StaffAccess: listing them,
 * applying one to a workspace's contract, closing one.
 */
export const ContractRequestsDeskHandlers = HttpApiBuilder.group(
  Api,
  "contractRequestsDesk",
  Effect.fn(function* contractRequestsDeskHandlers(handlers) {
    const desk = yield* ContractRequestDesk;

    return handlers
      .handle("list", () =>
        desk.open.pipe(
          Effect.map((requests) => requests.map(openRequestView)),
          Effect.catchTag("DatabaseError", Effect.die)
        )
      )
      .handle("apply", ({ params, payload }) =>
        Effect.gen(function* apply() {
          const staff = yield* CurrentStaff;

          const named = Option.all({
            id: decodeRequestId(params.requestId),
            workspaceId: decodeWorkspaceId(payload.workspaceId),
          });

          if (Option.isNone(named)) {
            return yield* notFound();
          }

          const done = yield* desk
            .apply({
              ...named.value,
              reason: payload.reason,
              staffId: UserIdSchema.make(staff.userId),
            })
            .pipe(
              Effect.catchTags({
                BillingOff: () => Effect.fail(new BillingNotEnabled()),
                ContractRequestNotFound: notFound,
                ContractRequestSettled: settled,
                DatabaseError: Effect.die,
                StripeUnreachable: ({ workspaceId }) =>
                  Effect.logWarning(
                    "Stripe could not be reached to apply a contract request"
                  ).pipe(
                    Effect.andThen(
                      Effect.fail(new BillingUnavailable({ workspaceId }))
                    )
                  ),
              })
            );

          return outcomeView(done);
        })
      )
      .handle("close", ({ params, payload }) =>
        Effect.gen(function* close() {
          const staff = yield* CurrentStaff;
          const id = decodeRequestId(params.requestId);

          if (Option.isNone(id)) {
            return yield* notFound();
          }

          const done = yield* desk
            .close({
              id: id.value,
              reason: payload.reason,
              staffId: UserIdSchema.make(staff.userId),
            })
            .pipe(
              Effect.catchTags({
                ContractRequestNotFound: notFound,
                ContractRequestSettled: settled,
                DatabaseError: Effect.die,
              })
            );

          return outcomeView(done);
        })
      );
  })
);
