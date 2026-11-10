import { DateTime, Effect, FiberSet, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  BillingNotEnabled,
  BillingUnavailable,
  ContractRequestNotFound,
  DesiredDayTooFar,
  desiredDayHorizonDays,
} from "peal-contract";

import { outcomeView } from "#billing/api/contract-request-view.ts";
import { ConfirmContractRequest } from "#billing/application/confirm-contract-request.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { ReceiveContractRequest } from "#billing/application/receive-contract-request.ts";
import { withinHorizon } from "#billing/domain/desired-day.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { CaptchaChallenge } from "#workspace/application/captcha-challenge.ts";

// Requests still being looked at get this long when the server stops; the
// sweep takes up the rest.
const drainTimeout = "10 seconds";

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

// The end of a calendar day, UTC: the instant the next one starts.
const endOfDay = (day: string): Option.Option<DateTime.Utc> =>
  DateTime.make(`${day}T00:00:00Z`).pipe(
    Option.map((start) => DateTime.add(start, { days: 1 }))
  );

const notFound = () => Effect.fail(new ContractRequestNotFound());

/**
 * The cancel and withdraw functions anyone reaches. A new request is
 * recorded, answered with the moment it came, and looked at on a fiber of
 * the layer: the answer takes as long, and says as much, whatever its
 * address or its contract number find.
 */
export const ContractRequestsHandlers = HttpApiBuilder.group(
  Api,
  "contractRequests",
  Effect.fn(function* contractRequestsHandlers(handlers) {
    const { enabled } = yield* BillingMode;
    const captcha = yield* CaptchaChallenge;
    const function_ = yield* ReceiveContractRequest;
    const confirmations = yield* ConfirmContractRequest;
    const fibers = yield* FiberSet.make();

    yield* Effect.addFinalizer(() =>
      FiberSet.awaitEmpty(fibers).pipe(Effect.timeoutOption(drainTimeout))
    );

    return handlers
      .handle("functions", () =>
        Effect.succeed({
          enabled,
          turnstileSiteKey: Option.getOrNull(captcha.turnstileSiteKey),
        })
      )
      .handle("send", ({ payload }) =>
        Effect.gen(function* send() {
          const desiredAt = Option.fromNullOr(payload.desiredOn).pipe(
            Option.flatMap(endOfDay)
          );

          if (!withinHorizon(desiredAt, yield* DateTime.now)) {
            return yield* new DesiredDayTooFar({
              horizonDays: desiredDayHorizonDays,
            });
          }

          const received = yield* function_
            .receive({
              contract: Option.fromNullOr(payload.contract),
              desiredAt,
              email: payload.email,
              kind: payload.kind,
              locale: payload.locale,
              name: payload.name,
            })
            .pipe(
              Effect.catchTags({
                BillingOff: () => Effect.fail(new BillingNotEnabled()),
                DatabaseError: Effect.die,
              })
            );

          yield* FiberSet.run(
            fibers,
            function_.process(received.id).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning(
                  "A contract request waits for the next sweep",
                  cause
                )
              ),
              Effect.annotateLogs({ requestId: received.id })
            )
          );

          return { receivedAt: received.receivedAt };
        })
      )
      .handle("preview", ({ payload }) =>
        confirmations.preview(payload.token).pipe(
          Effect.map(({ contracts, request }) => ({
            contracts: contracts.map((contract) => ({
              periodEnd: Option.getOrNull(contract.periodEnd),
              plan: contract.plan,
              trial: contract.trial,
              workspaceId: contract.workspaceId,
              workspaceName: contract.workspaceName,
            })),
            desiredOn: Option.getOrNull(request.desiredAt),
            kind: request.kind,
            receivedAt: request.receivedAt,
          })),
          Effect.catchTags({
            ContractRequestNotFound: notFound,
            DatabaseError: Effect.die,
          })
        )
      )
      .handle("confirm", ({ payload }) =>
        Option.match(decodeWorkspaceId(payload.workspaceId), {
          onNone: notFound,
          onSome: (workspaceId) =>
            confirmations.confirm(payload.token, workspaceId).pipe(
              Effect.map(outcomeView),
              Effect.catchTags({
                BillingOff: () => Effect.fail(new BillingNotEnabled()),
                ContractRequestNotFound: notFound,
                DatabaseError: Effect.die,
                StripeUnreachable: (failure) =>
                  Effect.logWarning(
                    "Stripe could not be reached to apply a contract request"
                  ).pipe(
                    Effect.andThen(
                      Effect.fail(
                        new BillingUnavailable({
                          workspaceId: failure.workspaceId,
                        })
                      )
                    )
                  ),
              })
            ),
        })
      );
  })
);
