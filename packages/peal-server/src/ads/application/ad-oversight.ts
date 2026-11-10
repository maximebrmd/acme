import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { AccountStore } from "./ports/account-store.ts";
import type { AuthorizedAccount } from "./ports/account-store.ts";
import { BoostStore } from "./ports/boost-store.ts";

/** A workspace's ads as the staff console reads them. */
export interface AdsOverview {
  readonly accounts: readonly AuthorizedAccount[];
  /** How many of its boosts stand in each state. */
  readonly boosts: Readonly<Record<string, number>>;
}

/**
 * A workspace's ad accounts and how many boosts it has in each state, as
 * the staff console reads them. It checks no permission: only the staff
 * context calls it, for staff, and gives metadata only: never a token, an
 * audience, a campaign's name or what an ad spent.
 */
export class AdOversight extends Context.Service<
  AdOversight,
  {
    readonly ofWorkspace: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<AdsOverview, DatabaseError>;
  }
>()("peal-server/ads/application/AdOversight") {
  static readonly layer = Layer.effect(
    AdOversight,
    Effect.gen(function* AdOversightLive() {
      const accounts = yield* AccountStore;
      const boosts = yield* BoostStore;

      return AdOversight.of({
        ofWorkspace: (workspaceId) =>
          Effect.all({
            accounts: accounts.list(workspaceId),
            boosts: boosts.countsByState(workspaceId),
          }),
      });
    })
  );
}
