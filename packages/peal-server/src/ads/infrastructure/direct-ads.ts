import { Context, Effect, Layer } from "effect";

import { BoostOperations } from "#ads/application/boost-operations.ts";
import { AccountSyncer } from "#ads/application/ports/account-syncer.ts";
import { BoostGateway } from "#ads/application/ports/boost-gateway.ts";
import { SyncAccount } from "#ads/application/sync-account.ts";

/**
 * The sync and the boosts' requests run where they are asked, without a
 * gate: for a process without the cluster (tests, and the routes built
 * alone), where nothing else calls an account at the same time. The
 * server uses `GatedAds`.
 */
export const DirectAds = Layer.effectContext(
  Effect.gen(function* DirectAds() {
    const sync = yield* SyncAccount;
    const operations = yield* BoostOperations;

    return Context.make(
      AccountSyncer,
      AccountSyncer.of({ sync: (accountId) => sync.run(accountId) })
    ).pipe(
      Context.add(
        BoostGateway,
        BoostGateway.of({
          control: (request) => operations.control(request),
          place: ({ boostId }) => operations.place(boostId),
        })
      )
    );
  })
);
