import { DateTime, Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  Api,
  BillingNotEnabled,
  BillingUnavailable,
  CurrentMember,
  DesiredDayTooFar,
  desiredDayHorizonDays,
  NothingToCancel,
  PlanTooSmall,
  ReductionRefused,
  TrialUnavailable,
  WithdrawalUnavailable,
} from "peal-contract";
import type { Member } from "peal-contract";

import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { PlaceOrder } from "#billing/application/place-order.ts";
import { ReduceWorkspace } from "#billing/application/reduce-workspace.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import { withinHorizon } from "#billing/domain/desired-day.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden, personRequired } from "#shared/api/forbidden.ts";

import { standingView } from "./billing-view.ts";

const notEnabled = () => Effect.fail(new BillingNotEnabled());

// Stripe not answering, logged before the client hears 503.
const unreachable = ({ workspaceId }: { readonly workspaceId: string }) =>
  Effect.logWarning(
    "Stripe could not be reached about a workspace's billing"
  ).pipe(
    Effect.annotateLogs({ workspaceId }),
    Effect.andThen(Effect.fail(new BillingUnavailable({ workspaceId })))
  );

/**
 * The member, when they act in their own session: never an API key, an
 * OAuth client (the command line or an MCP client), nor staff
 * impersonating them.
 */
const inPerson = (member: Member) =>
  member.principal._tag === "user" &&
  member.principal.impersonatedBy === null &&
  member.principal.oauth === undefined
    ? Effect.succeed(actorOf(member))
    : personRequired();

export const BillingActionsHandlers = HttpApiBuilder.group(
  Api,
  "billingActions",
  Effect.fn(function* billingActionsHandlers(handlers) {
    const orders = yield* PlaceOrder;
    const cancellations = yield* CancelSubscription;
    const withdrawals = yield* Withdraw;
    const reductions = yield* ReduceWorkspace;

    const withdrawalErrors = {
      BillingOff: notEnabled,
      DatabaseError: Effect.die,
      MissingPermission: forbidden,
      PersonRequired: forbidden,
      StripeUnreachable: unreachable,
      WithdrawalUnavailable: ({
        reason,
      }: {
        readonly reason: WithdrawalUnavailable["reason"];
      }) => Effect.fail(new WithdrawalUnavailable({ reason })),
    } as const;

    return handlers
      .handle("order", ({ payload }) =>
        Effect.gen(function* order() {
          const actor = yield* inPerson(yield* CurrentMember);

          const placed = yield* orders
            .place(actor, {
              interval: payload.interval,
              plan: payload.plan,
              trial: payload.trial,
            })
            .pipe(
              Effect.catchTags({
                BillingOff: notEnabled,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PersonRequired: forbidden,
                PlanTooSmall: ({ over, plan, planWithRoom }) =>
                  Effect.fail(
                    new PlanTooSmall({
                      over,
                      plan,
                      planWithRoom: Option.getOrNull(planWithRoom),
                    })
                  ),
                StripeUnreachable: unreachable,
                TrialUnavailable: ({ reason }) =>
                  Effect.fail(new TrialUnavailable({ reason })),
              })
            );

          return {
            createdAt: placed.createdAt,
            id: placed.id,
            interval: placed.interval,
            plan: placed.plan,
            trial: placed.trial,
          };
        })
      )
      .handle("cancel", ({ payload }) =>
        Effect.gen(function* cancel() {
          const actor = yield* inPerson(yield* CurrentMember);

          // The end of the day asked for, UTC.
          const desiredAt = Option.fromNullishOr(payload.desiredOn).pipe(
            Option.flatMap((day) => DateTime.make(`${day}T00:00:00Z`)),
            Option.map((start) => DateTime.add(start, { days: 1 }))
          );

          if (!withinHorizon(desiredAt, yield* DateTime.now)) {
            return yield* new DesiredDayTooFar({
              horizonDays: desiredDayHorizonDays,
            });
          }

          return yield* cancellations.cancel(actor, desiredAt).pipe(
            Effect.catchTags({
              BillingOff: notEnabled,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              NothingToCancel: () => Effect.fail(new NothingToCancel()),
              PersonRequired: forbidden,
              StripeUnreachable: unreachable,
            })
          );
        })
      )
      .handle("withdrawal", () =>
        Effect.gen(function* withdrawal() {
          const actor = yield* inPerson(yield* CurrentMember);

          return yield* withdrawals
            .preview(actor)
            .pipe(Effect.catchTags(withdrawalErrors));
        })
      )
      .handle("reduce", ({ payload }) =>
        Effect.gen(function* reduce() {
          const actor = yield* inPerson(yield* CurrentMember);

          const reduced = yield* reductions.keep(actor, payload).pipe(
            Effect.catchTags({
              BillingOff: notEnabled,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PersonRequired: forbidden,
              ReductionRefused: ({ reason }) =>
                Effect.fail(new ReductionRefused({ reason })),
            })
          );

          return { ...reduced, standing: standingView(reduced.standing) };
        })
      )
      .handle("withdraw", () =>
        Effect.gen(function* withdraw() {
          const actor = yield* inPerson(yield* CurrentMember);

          return yield* withdrawals
            .confirm(actor)
            .pipe(Effect.catchTags(withdrawalErrors));
        })
      );
  })
);
