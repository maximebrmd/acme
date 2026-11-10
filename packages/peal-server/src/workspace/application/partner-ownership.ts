import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { CustomerWorkspaces } from "./customer-workspaces.ts";
import type { WorkspaceOwner } from "./customer-workspaces.ts";
import { PartnerOwnsWorkspaces } from "./partner-owns-workspaces.ts";
import { PartnerStore } from "./partner-store.ts";

/** The workspaces that share one plan: a partner's home and those it owns. */
export interface PlanPool {
  /** The workspace whose plan they share: the partner's home workspace. */
  readonly holder: WorkspaceId;
  /** The others of the pool, the holder included unless it is `of`. */
  readonly others: readonly WorkspaceId[];
}

/**
 * Whose a workspace is, for the contexts that follow from it: billing,
 * which gives a workspace a partner owns its partner's plan; the channels
 * context, which counts a partner's channels together; the webhooks, which
 * tell the partner what happens in its workspaces. Reads only, and no
 * permission check: callers act for a request that passed its own.
 */
export class PartnerOwnership extends Context.Service<
  PartnerOwnership,
  {
    /** The partner that owns the workspace, if one does. */
    readonly ownerOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<WorkspaceOwner>, DatabaseError>;
    /**
     * The pool the workspace is in: a workspace a partner owns, or a
     * partner's home workspace; none for any other workspace. In a
     * transaction, the pool stays held until it ends
     * (`CustomerWorkspaces.hold`), so what is counted across it and then
     * added takes turns.
     */
    readonly poolOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<PlanPool>, DatabaseError>;
    /** Whether the workspace is a partner account's home workspace. */
    readonly isHome: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Refuses while the partner account of one of these workspaces still
     * owns workspaces: deleting it would leave them with nobody to answer
     * for them. In a transaction, each partner stays held until it ends,
     * so none gains a workspace meanwhile.
     */
    readonly ensureDeletable: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<void, DatabaseError | PartnerOwnsWorkspaces>;
  }
>()("peal-server/workspace/application/PartnerOwnership") {
  static readonly layer = Layer.effect(
    PartnerOwnership,
    Effect.gen(function* PartnerOwnershipLive() {
      const partners = yield* PartnerStore;
      const workspaces = yield* CustomerWorkspaces;

      const poolOf = Effect.fn("PartnerOwnership.poolOf")(function* poolOf(
        workspaceId: WorkspaceId
      ) {
        const owner = yield* workspaces.ownerOf(workspaceId);

        const partner = Option.isSome(owner)
          ? Option.some({
              holder: owner.value.homeWorkspaceId,
              partnerId: owner.value.partnerId,
            })
          : (yield* partners.ofWorkspace(workspaceId)).pipe(
              Option.map(({ id }) => ({ holder: workspaceId, partnerId: id }))
            );

        if (Option.isNone(partner)) {
          return Option.none<PlanPool>();
        }

        const { holder, partnerId } = partner.value;

        yield* workspaces.hold(partnerId);

        const owned = yield* workspaces.idsOf(partnerId);

        return Option.some<PlanPool>({
          holder,
          others: [holder, ...owned].filter((id) => id !== workspaceId),
        });
      });

      const ensureDeletable = Effect.fn("PartnerOwnership.ensureDeletable")(
        function* ensureDeletable(workspaceIds: readonly WorkspaceId[]) {
          yield* Effect.forEach(
            workspaceIds,
            Effect.fnUntraced(function* deletable(workspaceId) {
              const partner = yield* partners.ofWorkspace(workspaceId);

              if (Option.isNone(partner)) {
                return;
              }

              yield* workspaces.hold(partner.value.id);

              const owned = yield* workspaces.idsOf(partner.value.id);

              if (owned.length > 0) {
                yield* new PartnerOwnsWorkspaces({
                  owned: owned.length,
                  workspaceId,
                });
              }
            }),
            { discard: true }
          );
        }
      );

      return PartnerOwnership.of({
        ensureDeletable,
        isHome: (workspaceId) =>
          partners.ofWorkspace(workspaceId).pipe(Effect.map(Option.isSome)),
        ownerOf: (workspaceId) => workspaces.ownerOf(workspaceId),
        poolOf,
      });
    })
  );

  /** For tests without partners: every workspace is its own. */
  static readonly layerNone = Layer.succeed(
    PartnerOwnership,
    PartnerOwnership.of({
      ensureDeletable: () => Effect.void,
      isHome: () => Effect.succeed(false),
      ownerOf: () => Effect.succeedNone,
      poolOf: () => Effect.succeedNone,
    })
  );
}
