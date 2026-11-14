import { Context, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { CustomerWorkspace } from "#workspace/domain/customer-workspace.ts";
import { MissingPartnerScope } from "#workspace/domain/missing-partner-scope.ts";
import type { PartnerKeyPrincipal } from "#workspace/domain/partner-key-principal.ts";

import type { AccountConnectedThere } from "./account-connected-there.ts";
import { AccountStore } from "./account-store.ts";
import { ChannelMover } from "./channel-mover.ts";
import type { MovedChannel } from "./channel-mover.ts";
import type { CustomerChannelNotFound } from "./customer-channel-not-found.ts";
import { CustomerWorkspaceNotFound } from "./customer-workspace-not-found.ts";
import { CustomerWorkspaces } from "./customer-workspaces.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";

const decodeWorkspaceId = Schema.decodeUnknownOption(WorkspaceIdSchema);

// What a key moves with: taking the channel out of one workspace, and
// connecting it in the other.
const movingPermissions = ["channel:disconnect", "channel:connect"] as const;

/** A channel to move, as a partner's server asks. */
export interface ChannelMoveRequest {
  readonly channelId: string;
  readonly from: string;
  readonly to: string;
}

/** A channel moved: as it stands where it went, and the two workspaces. */
export interface ChannelMoved {
  readonly channel: MovedChannel;
  readonly from: WorkspaceId;
  readonly to: WorkspaceId;
}

export type ChannelMoveFailure =
  | AccountConnectedThere
  | CustomerChannelNotFound
  | CustomerWorkspaceNotFound
  | DatabaseError
  | MissingPartnerScope
  | MissingPermission
  | WorkspaceBusy;

/**
 * Moves a channel between two workspaces one partner owns, for its key:
 * a customer's account that belongs with another of its customers. Both
 * share the partner's plan, so the pool holds as many accounts after as
 * before. The channels context decides what the move does
 * (`ChannelMoves`); this decides who may, and between which workspaces.
 *
 * Needs the scope `workspaces:write`, and the key's permissions
 * `channel:disconnect` and `channel:connect`. Only workspaces the key's
 * partner owns: its home workspace and anyone else's read as ones that do
 * not exist. Both stay locked from the check to the move (their rows, the
 * smaller id first), so an offboarding of either waits for the move, or
 * the move finds the workspace gone, and never adds a channel to a
 * workspace being erased.
 */
export class MoveCustomerChannel extends Context.Service<
  MoveCustomerChannel,
  {
    readonly move: (
      key: PartnerKeyPrincipal,
      request: ChannelMoveRequest
    ) => Effect.Effect<ChannelMoved, ChannelMoveFailure>;
  }
>()("peal-server/workspace/application/MoveCustomerChannel") {
  static readonly layer = Layer.effect(
    MoveCustomerChannel,
    Effect.gen(function* MoveCustomerChannelLive() {
      const workspaces = yield* CustomerWorkspaces;
      const accounts = yield* AccountStore;
      const mover = yield* ChannelMover;

      // The workspace, while the key's partner owns it.
      const ownedBy = Effect.fn("MoveCustomerChannel.ownedBy")(
        function* ownedBy(key: PartnerKeyPrincipal, requested: string) {
          const id = decodeWorkspaceId(requested);

          const owned = Option.isSome(id)
            ? yield* workspaces.ofPartner(key.partnerId, id.value)
            : Option.none<CustomerWorkspace>();

          return Option.isSome(owned)
            ? owned.value
            : yield* new CustomerWorkspaceNotFound();
        }
      );

      // Both workspaces locked, then the partner's still: in the move's
      // transaction, as an offboarding locks the one it erases first.
      const stillOwned = (
        key: PartnerKeyPrincipal,
        workspaceIds: readonly WorkspaceId[]
      ) =>
        Effect.forEach(
          workspaceIds.toSorted(),
          (workspaceId) =>
            accounts
              .workspace(workspaceId)
              .pipe(Effect.andThen(ownedBy(key, workspaceId))),
          { discard: true }
        );

      const move = Effect.fn("MoveCustomerChannel.move")(function* move(
        key: PartnerKeyPrincipal,
        request: ChannelMoveRequest
      ) {
        yield* key.scopes.includes("workspaces:write")
          ? Effect.void
          : Effect.fail(new MissingPartnerScope({ scope: "workspaces:write" }));

        const missing = movingPermissions.find(
          (permission) => !key.permissions.includes(permission)
        );

        yield* missing === undefined
          ? Effect.void
          : Effect.fail(new MissingPermission({ permission: missing }));

        const from = yield* ownedBy(key, request.from);
        const to = yield* ownedBy(key, request.to);

        const channel = yield* mover.move({
          channelId: request.channelId,
          from: from.id,
          inside: stillOwned(key, [...new Set([from.id, to.id])]),
          to: to.id,
        });

        const moved: ChannelMoved = { channel, from: from.id, to: to.id };

        return moved;
      });

      return MoveCustomerChannel.of({ move });
    })
  );
}
