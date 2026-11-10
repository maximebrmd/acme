import { Context, Duration, Effect, Layer, Schedule } from "effect";
import { Entity } from "effect/cluster";
import { Rpc } from "effect/rpc";

import { AdNetworkUnavailable } from "#ads/application/ad-network-unavailable.ts";
import { BoostOperations } from "#ads/application/boost-operations.ts";
import {
  AccountSyncer,
  SyncOutcomeSchema,
} from "#ads/application/ports/account-syncer.ts";
import {
  BoostGateway,
  ControlFailureSchema,
  ControlRequestSchema,
  PlaceResultSchema,
} from "#ads/application/ports/boost-gateway.ts";
import { SyncAccount } from "#ads/application/sync-account.ts";
import { AdAccountIdSchema, BoostIdSchema } from "#ads/domain/ids.ts";

/**
 * One entity per ad account (its id is the account's), which makes every
 * call to the account at its network, one at a time: handlers run in turn,
 * so two boosts of an account are made one after the other, a pause never
 * races a placement, and a sync waits for both. Networks hold an ad
 * account that is called in bursts: nothing here runs calls side by side.
 *
 * Calls are volatile and carry ids only: no amount, audience or token
 * lands in the cluster's tables. The job calling `Place` is durable, and
 * the journal covers a call cut short.
 */
export const AdGate = Entity.make("AdGate", [
  Rpc.make("Sync", {
    payload: { accountId: AdAccountIdSchema },
    success: SyncOutcomeSchema,
  }),
  Rpc.make("Place", {
    payload: { boostId: BoostIdSchema },
    success: PlaceResultSchema,
  }),
  Rpc.make("GiveUp", {
    payload: { boostId: BoostIdSchema },
  }),
  Rpc.make("Control", {
    error: ControlFailureSchema,
    payload: { request: ControlRequestSchema },
  }),
]);

/**
 * Runs the gate on the context's use cases. A bug in one fails its own
 * call instead of restarting the entity, which would replay the call in
 * flight.
 */
export const AdGateLive = AdGate.toLayer(
  Effect.gen(function* AdGateLive() {
    const sync = yield* SyncAccount;
    const operations = yield* BoostOperations;

    return AdGate.of({
      Control: ({ payload }) => operations.control(payload.request),
      GiveUp: ({ payload }) => operations.giveUp(payload.boostId),
      Place: ({ payload }) => operations.place(payload.boostId),
      Sync: ({ payload }) => sync.run(payload.accountId),
    });
  }),
  { disableFatalDefects: true, maxIdleTime: Duration.minutes(10) }
);

// The gate did not take the call, so nothing was sent: worth a few quick
// tries.
const notTakenRetry = Schedule.exponential("100 millis", 2);

const notTaken = (error: { readonly _tag: string }) =>
  error._tag === "MailboxFull" || error._tag === "EntityNotAssignedToRunner";

/**
 * The sync and the boosts' requests through each account's gate. Provide
 * AdGateLive beside it.
 */
export const GatedAds = Layer.effectContext(
  Effect.gen(function* GatedAds() {
    const gateFor = yield* AdGate.client;

    const syncer = AccountSyncer.of({
      sync: (accountId) =>
        gateFor(accountId)
          .Sync({ accountId })
          .pipe(
            Effect.retry({
              schedule: notTakenRetry,
              times: 4,
              while: notTaken,
            }),
            // Not taken, or broken in its handler: nothing was saved, and
            // the next run reads the account.
            Effect.catch(() => Effect.succeed("unread" as const)),
            Effect.catchDefect((cause) =>
              Effect.logError(
                "An ad account's sync failed in its gate",
                cause
              ).pipe(Effect.as("unread" as const))
            )
          ),
    });

    const gateway = BoostGateway.of({
      control: (request) =>
        gateFor(request.accountId)
          .Control({ request })
          .pipe(
            Effect.retry({
              schedule: notTakenRetry,
              times: 4,
              while: notTaken,
            }),
            Effect.catchTags({
              // The gate is taking, or may have taken, the same call:
              // what it did is read from the boost, never assumed.
              AlreadyProcessingMessage: () =>
                Effect.fail(new AdNetworkUnavailable({})),
              EntityNotAssignedToRunner: () =>
                Effect.fail(new AdNetworkUnavailable({})),
              MailboxFull: () => Effect.fail(new AdNetworkUnavailable({})),
              PersistenceError: () => Effect.fail(new AdNetworkUnavailable({})),
            }),
            Effect.catchDefect((cause) =>
              Effect.logError(
                "A change to a boost failed in its gate",
                cause
              ).pipe(Effect.andThen(Effect.fail(new AdNetworkUnavailable({}))))
            )
          ),
      giveUp: ({ accountId, boostId }) =>
        gateFor(accountId)
          .GiveUp({ boostId })
          .pipe(
            Effect.retry({
              schedule: notTakenRetry,
              times: 4,
              while: notTaken,
            }),
            // Not taken: the job's activity fails, and is run again.
            Effect.orDie
          ),
      place: ({ accountId, boostId }) =>
        gateFor(accountId)
          .Place({ boostId })
          .pipe(
            Effect.retry({
              schedule: notTakenRetry,
              times: 4,
              while: notTaken,
            }),
            // Whatever happened, the next attempt reads the journal and
            // looks up what was made before it sends anything.
            Effect.catch(() => Effect.succeed("retry" as const)),
            Effect.catchDefect((cause) =>
              Effect.logError(
                "A boost's placement failed in its gate",
                cause
              ).pipe(Effect.as("retry" as const))
            )
          ),
    });

    return Context.make(AccountSyncer, syncer).pipe(
      Context.add(BoostGateway, gateway)
    );
  })
);
