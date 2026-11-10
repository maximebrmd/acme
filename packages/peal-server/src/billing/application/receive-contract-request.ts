import { Context, DateTime, Effect, Layer, Option } from "effect";

import { BillingOff } from "#billing/domain/billing-off.ts";
import { readReference } from "#billing/domain/contract-reference.ts";
import {
  changed,
  ContractRequest,
  ContractRequestIdSchema,
} from "#billing/domain/contract-request.ts";
import type {
  ContractRequestId,
  ContractRequestKind,
} from "#billing/domain/contract-request.ts";
import { catchUpDelay, requestBatch } from "#billing/domain/request-limits.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";

import { currentSubscription } from "./current-subscription.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { ContractHolders } from "./ports/contract-holders.ts";
import { ContractReferences } from "./ports/contract-references.ts";
import { ContractRequests } from "./ports/contract-requests.ts";
import type { Subscriptions } from "./ports/subscriptions.ts";
import { SettleContractRequest } from "./settle-contract-request.ts";
import type { StripeUnreachable } from "./stripe-unreachable.ts";

/**
 * What the form holds: what the law lets a trader ask to identify the
 * customer and the contract (Code de la consommation D215-2 and D221-5),
 * and nothing more.
 */
export interface RequestForm {
  /** The contract's number, or the workspace's name. */
  readonly contract: Option.Option<string>;
  /** When the contract should end, for a cancellation, if they say. */
  readonly desiredAt: Option.Option<DateTime.Utc>;
  /** Where the acknowledgement goes. */
  readonly email: string;
  readonly kind: ContractRequestKind;
  /** The language of the page. */
  readonly locale: Locale;
  readonly name: string;
}

/** What the form's sender is told: that it came, and when. */
export interface ReceivedRequest {
  readonly id: ContractRequestId;
  readonly receivedAt: DateTime.Utc;
}

/**
 * The cancel and withdraw functions anyone reaches without signing in.
 * `receive` records the request with the moment it came, which is the one
 * that counts, and answers nothing else: not whether its address has an
 * account, nor whether its contract number was right. `process` then looks
 * at it: one that gives a contract's number is applied at once, as its
 * holder has the contract's papers; one whose address manages a contract
 * waits for the link sent to that address, so a stranger who knows the
 * address ends nothing; any other waits for staff. Each is acknowledged by
 * email. `catchUp` takes up again, on its cron, what the mail or Stripe
 * could not take; says how many it looked at.
 */
export class ReceiveContractRequest extends Context.Service<
  ReceiveContractRequest,
  {
    readonly catchUp: Effect.Effect<number, DatabaseError>;
    readonly process: (
      id: ContractRequestId
    ) => Effect.Effect<void, BillingOff | DatabaseError | StripeUnreachable>;
    readonly receive: (
      form: RequestForm
    ) => Effect.Effect<ReceivedRequest, BillingOff | DatabaseError>;
  }
>()("peal-server/billing/application/ReceiveContractRequest") {
  static readonly layer = Layer.effect(
    ReceiveContractRequest,
    Effect.gen(function* ReceiveContractRequestLive() {
      const { enabled } = yield* BillingMode;
      const requests = yield* ContractRequests;
      const holders = yield* ContractHolders;
      const references = yield* ContractReferences;
      const settle = yield* SettleContractRequest;
      const context = yield* Effect.context<Ids | Subscriptions>();

      const receive = Effect.fn("ReceiveContractRequest.receive")(
        function* receive(form: RequestForm) {
          if (!enabled) {
            return yield* new BillingOff();
          }

          const receivedAt = yield* DateTime.now;
          const holder = yield* holders.byEmail(form.email);

          const request = new ContractRequest({
            acknowledgedAt: Option.none(),
            acknowledgement: "pending",
            channel: "form",
            contract: form.contract,
            desiredAt:
              form.kind === "cancellation" ? form.desiredAt : Option.none(),
            effectiveAt: Option.none(),
            email: Option.some(form.email),
            id: yield* newId(ContractRequestIdSchema),
            kind: form.kind,
            locale: form.locale,
            name: Option.some(form.name),
            receivedAt,
            refunded: Option.none(),
            refusal: Option.none(),
            settledAt: Option.none(),
            status: "received",
            stripeSubscriptionId: Option.none(),
            userId: holder.pipe(Option.map(({ userId }) => userId)),
            workspaceId: Option.none(),
          });

          yield* requests.save(request);

          const received: ReceivedRequest = { id: request.id, receivedAt };

          return received;
        },
        Effect.provide(context)
      );

      // Whether the request's address manages a contract: a workspace
      // with a subscription that gives its plan.
      const managesContract = Effect.fn(
        "ReceiveContractRequest.managesContract"
      )(function* managesContract(request: ContractRequest) {
        if (Option.isNone(request.userId)) {
          return false;
        }

        const holder = yield* holders.byId(request.userId.value);

        const subscribed = yield* Effect.forEach(
          Option.match(holder, {
            onNone: () => [],
            onSome: ({ workspaces }) => workspaces,
          }),
          ({ id }) => currentSubscription(id)
        );

        return subscribed.some(Option.isSome);
      }, Effect.provide(context));

      // What a request just received becomes.
      const looked = Effect.fn("ReceiveContractRequest.looked")(
        function* looked(request: ContractRequest) {
          const named = yield* request.contract.pipe(
            Option.flatMap(readReference),
            Option.match({
              onNone: () => Effect.succeedNone,
              onSome: (reference) => references.find(reference),
            })
          );

          if (Option.isSome(named)) {
            return yield* settle.apply(
              request,
              named.value.workspaceId,
              Option.some(named.value.stripeSubscriptionId)
            );
          }

          const waiting = changed(request, {
            status: (yield* managesContract(request))
              ? "awaitingConfirmation"
              : "unmatched",
          });

          yield* requests.save(waiting);

          return waiting;
        }
      );

      const processed = Effect.fn("ReceiveContractRequest.processed")(
        function* processed(request: ContractRequest) {
          if (request.channel !== "form") {
            return;
          }

          yield* settle.acknowledge(
            request.status === "received" ? yield* looked(request) : request
          );
        }
      );

      const process = Effect.fn("ReceiveContractRequest.process")(
        function* process(id: ContractRequestId) {
          const found = yield* requests.byId(id);

          if (Option.isSome(found)) {
            yield* processed(found.value);
          }
        }
      );

      const catchUp = Effect.gen(function* catchUp() {
        if (!enabled) {
          return 0;
        }

        const now = yield* DateTime.now;

        const waiting = yield* requests.pending(
          DateTime.subtractDuration(now, catchUpDelay),
          requestBatch
        );

        yield* Effect.forEach(
          waiting,
          (request) =>
            processed(request).pipe(
              Effect.catchTags({
                BillingOff: () => Effect.void,
                DatabaseError: (failure) =>
                  Effect.logWarning(
                    "A contract request could not be looked at",
                    failure
                  ),
                StripeUnreachable: () =>
                  Effect.logWarning(
                    "Stripe could not be reached to apply a contract request"
                  ),
              }),
              Effect.annotateLogs({ requestId: request.id })
            ),
          { discard: true }
        );

        return waiting.length;
      }).pipe(Effect.withSpan("ReceiveContractRequest.catchUp"));

      return ReceiveContractRequest.of({ catchUp, process, receive });
    })
  );
}
