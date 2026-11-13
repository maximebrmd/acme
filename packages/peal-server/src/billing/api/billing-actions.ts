import { DateTime, Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";
import {
  AlreadySubscribed,
  Api,
  BilledElsewhere,
  BillingNotEnabled,
  BillingUnavailable,
  ConsentChanged,
  CurrentMember,
  DesiredDayTooFar,
  desiredDayHorizonDays,
  NothingToCancel,
  PlanNotSold,
  PlanTooSmall,
  ReductionRefused,
  TransferNotFound,
  TransferRefused,
  TrialUnavailable,
  WithdrawalUnavailable,
} from "peal-contract";
import type { Member } from "peal-contract";

import { AccountViews } from "#billing/application/account-views.ts";
import { CancelSubscription } from "#billing/application/cancel-subscription.ts";
import { PlaceOrder } from "#billing/application/place-order.ts";
import { ReduceWorkspace } from "#billing/application/reduce-workspace.ts";
import { TransferWorkspace } from "#billing/application/transfer-workspace.ts";
import { Withdraw } from "#billing/application/withdraw.ts";
import { withinHorizon } from "#billing/domain/desired-day.ts";
import { actorOf } from "#shared/api/actor.ts";
import { forbidden, personRequired } from "#shared/api/forbidden.ts";
import { limitRefusal } from "#shared/api/limit-reached.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";

import { accountView, standingView } from "./billing-view.ts";

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

const transferRefused = ({
  reason,
}: {
  readonly reason: TransferRefused["reason"];
}) => Effect.fail(new TransferRefused({ reason }));

export const BillingActionsHandlers = HttpApiBuilder.group(
  Api,
  "billingActions",
  Effect.fn(function* billingActionsHandlers(handlers) {
    const orders = yield* PlaceOrder;
    const cancellations = yield* CancelSubscription;
    const withdrawals = yield* Withdraw;
    const reductions = yield* ReduceWorkspace;
    const transfers = yield* TransferWorkspace;
    const accounts = yield* AccountViews;
    const limitReached = yield* limitRefusal;

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
              consentVersion: payload.consentVersion,
              interval: payload.interval,
              plan: payload.plan,
              trial: payload.trial,
            })
            .pipe(
              Effect.catchTags({
                AlreadySubscribed: ({ status }) =>
                  Effect.fail(new AlreadySubscribed({ status })),
                BilledElsewhere: ({ billingWorkspaceId }) =>
                  Effect.fail(new BilledElsewhere({ billingWorkspaceId })),
                BillingOff: notEnabled,
                ConsentChanged: ({ current, shown }) =>
                  Effect.fail(
                    shown === undefined
                      ? new ConsentChanged({ current })
                      : new ConsentChanged({ current, shown })
                  ),
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
                PlanNotSold: ({ interval, plan }) =>
                  Effect.fail(new PlanNotSold({ interval, plan })),
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

          const account = yield* accounts.of(actor).pipe(Effect.orDie);

          return {
            ...reduced,
            standing: standingView(reduced.standing, Option.some(account)),
          };
        })
      )
      .handle("withdraw", () =>
        Effect.gen(function* withdraw() {
          const actor = yield* inPerson(yield* CurrentMember);

          return yield* withdrawals
            .confirm(actor)
            .pipe(Effect.catchTags(withdrawalErrors));
        })
      )
      .handle("offerTransfer", ({ payload }) =>
        Effect.gen(function* offerTransfer() {
          const actor = yield* inPerson(yield* CurrentMember);

          const offered = yield* transfers
            .offer(actor, UserIdSchema.make(payload.toUserId))
            .pipe(
              Effect.catchTags({
                BillingOff: notEnabled,
                DatabaseError: Effect.die,
                MissingPermission: forbidden,
                PersonRequired: forbidden,
                TransferRefused: transferRefused,
              })
            );

          return {
            expiresAt: offered.expiresAt,
            offeredAt: offered.offeredAt,
            offeredBy: offered.offeredBy,
            toUserId: offered.toUserId,
          };
        })
      )
      .handle("acceptTransfer", () =>
        Effect.gen(function* acceptTransfer() {
          const actor = yield* inPerson(yield* CurrentMember);

          yield* transfers.accept(actor).pipe(
            Effect.catchTags({
              BillingOff: notEnabled,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PersonRequired: forbidden,
              PlanLimitReached: limitReached,
              TransferNotFound: () => Effect.fail(new TransferNotFound()),
              TransferRefused: transferRefused,
            })
          );

          return accountView(yield* accounts.of(actor).pipe(Effect.orDie));
        })
      )
      .handle("withdrawTransfer", () =>
        Effect.gen(function* withdrawTransfer() {
          const actor = yield* inPerson(yield* CurrentMember);

          yield* transfers.withdraw(actor).pipe(
            Effect.catchTags({
              BillingOff: notEnabled,
              DatabaseError: Effect.die,
              MissingPermission: forbidden,
              PersonRequired: forbidden,
              TransferNotFound: () => Effect.fail(new TransferNotFound()),
            })
          );
        })
      );
  })
);
