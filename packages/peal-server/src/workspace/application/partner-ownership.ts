import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PartnerId } from "#workspace/domain/partner-id.ts";
import type { Partner } from "#workspace/domain/partner.ts";
import { allowsReturnTo } from "#workspace/domain/return-origin.ts";

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

/** How a workspace's hosted pages name who asks. */
export interface Presentation {
  readonly logoUrl: Option.Option<string>;
  readonly name: string;
}

/**
 * Whose a workspace is, for the contexts that follow from it: billing,
 * which gives a workspace a partner owns its partner's plan; the channels
 * context, which counts a partner's channels together and shows the
 * partner on its hosted pages; the webhooks, which tell the partner what
 * happens in its workspaces. Reads only, and no
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
    /** The partner that owns each of these workspaces; others left out. */
    readonly ownersIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, WorkspaceOwner>, DatabaseError>;
    /**
     * The pool each of these workspaces is in, as `poolOf` answers it, in
     * three reads whatever their number; one in no pool is left out. It
     * holds nothing, so what it answers may change before the caller acts:
     * for reports of a state (the overview's standing), never to count
     * and then add.
     */
    readonly poolsIn: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, PlanPool>, DatabaseError>;
    /**
     * Who a hosted page of the workspace says asks: its partner, the one
     * that owns it or whose home workspace it is, by the name and logo its
     * customers know; any other workspace by its own name. None once the
     * workspace is gone.
     */
    readonly presentedAs: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Option.Option<Presentation>, DatabaseError>;
    /**
     * Whether a hosted page of the workspace may send a browser to this
     * address: its origin is one the workspace's partner registered,
     * exactly. Never for a workspace without a partner.
     */
    readonly allowsReturnTo: (
      workspaceId: WorkspaceId,
      returnUrl: string
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * The partner account whose home workspace this is, with how many
     * workspaces it owns, for the staff console.
     */
    readonly accountOf: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<
      Option.Option<{ readonly partner: Partner; readonly workspaces: number }>,
      DatabaseError
    >;
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

      const poolsIn = Effect.fn("PartnerOwnership.poolsIn")(function* poolsIn(
        workspaceIds: readonly WorkspaceId[]
      ) {
        if (workspaceIds.length === 0) {
          return new Map<WorkspaceId, PlanPool>();
        }

        const owners = yield* workspaces.ownersIn(workspaceIds);

        const homes = yield* partners.ofWorkspaces(
          workspaceIds.filter((id) => !owners.has(id))
        );

        // Each workspace's partner, and the home workspace whose plan it
        // takes.
        const partnerOf = new Map<
          WorkspaceId,
          { readonly holder: WorkspaceId; readonly partnerId: PartnerId }
        >([
          ...[...owners].map(
            ([id, { homeWorkspaceId, partnerId }]) =>
              [id, { holder: homeWorkspaceId, partnerId }] as const
          ),
          ...[...homes].map(
            ([id, partner]) =>
              [id, { holder: id, partnerId: partner.id }] as const
          ),
        ]);

        const partnerIds = [
          ...new Set([...partnerOf.values()].map(({ partnerId }) => partnerId)),
        ];

        const owned = yield* workspaces.idsOfEach(partnerIds);

        return new Map(
          [...partnerOf].map(([workspaceId, { holder, partnerId }]) => [
            workspaceId,
            {
              holder,
              others: [holder, ...(owned.get(partnerId) ?? [])].filter(
                (id) => id !== workspaceId
              ),
            } satisfies PlanPool,
          ])
        );
      });

      // The partner account behind a workspace: the one that owns it, or
      // whose home workspace it is.
      const partnerOf = Effect.fn("PartnerOwnership.partnerOf")(
        function* partnerOf(workspaceId: WorkspaceId) {
          const owner = yield* workspaces.ownerOf(workspaceId);

          return Option.isSome(owner)
            ? yield* partners.get(owner.value.partnerId)
            : yield* partners.ofWorkspace(workspaceId);
        }
      );

      const presentedAs = Effect.fn("PartnerOwnership.presentedAs")(
        function* presentedAs(workspaceId: WorkspaceId) {
          const partner = yield* partnerOf(workspaceId);

          if (Option.isSome(partner)) {
            const { logoUrl, name }: Partner = partner.value;

            return Option.some<Presentation>({ logoUrl, name });
          }

          return (yield* workspaces.nameOf(workspaceId)).pipe(
            Option.map((name): Presentation => ({
              logoUrl: Option.none(),
              name,
            }))
          );
        }
      );

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

              yield* owned.length > 0
                ? Effect.fail(
                    new PartnerOwnsWorkspaces({
                      owned: owned.length,
                      workspaceId,
                    })
                  )
                : Effect.void;
            }),
            { discard: true }
          );
        }
      );

      const accountOf = Effect.fn("PartnerOwnership.accountOf")(
        function* accountOf(workspaceId: WorkspaceId) {
          const partner = yield* partners.ofWorkspace(workspaceId);

          if (Option.isNone(partner)) {
            return Option.none();
          }

          const owned = yield* workspaces.idsOf(partner.value.id);

          return Option.some({
            partner: partner.value,
            workspaces: owned.length,
          });
        }
      );

      return PartnerOwnership.of({
        accountOf,
        allowsReturnTo: (workspaceId, returnUrl) =>
          partnerOf(workspaceId).pipe(
            Effect.map(
              Option.exists(({ returnOrigins }) =>
                allowsReturnTo(returnOrigins, returnUrl)
              )
            )
          ),
        ensureDeletable,
        isHome: (workspaceId) =>
          partners.ofWorkspace(workspaceId).pipe(Effect.map(Option.isSome)),
        ownerOf: (workspaceId) => workspaces.ownerOf(workspaceId),
        ownersIn: (workspaceIds) => workspaces.ownersIn(workspaceIds),
        poolOf,
        poolsIn,
        presentedAs,
      });
    })
  );

  /** For tests without partners: every workspace is its own. */
  static readonly layerNone = Layer.succeed(
    PartnerOwnership,
    PartnerOwnership.of({
      accountOf: () => Effect.succeedNone,
      allowsReturnTo: () => Effect.succeed(false),
      ensureDeletable: () => Effect.void,
      isHome: () => Effect.succeed(false),
      ownerOf: () => Effect.succeedNone,
      ownersIn: () => Effect.succeed(new Map()),
      poolOf: () => Effect.succeedNone,
      poolsIn: () => Effect.succeed(new Map()),
      presentedAs: () => Effect.succeedNone,
    })
  );
}
