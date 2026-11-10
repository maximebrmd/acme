import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { actorFor } from "#workspace/domain/membership.ts";
import type { AccessDenied } from "#workspace/domain/membership.ts";
import type { Principal } from "#workspace/domain/principal.ts";

import { DirectoryUnavailable } from "./directory-unavailable.ts";
import { MemberDirectory } from "./member-directory.ts";
import { PartnerOwnership } from "./partner-ownership.ts";

/**
 * The actor a principal is in a workspace. Memberships and bans are read on
 * every request, so a removed member or a banned user loses access at once,
 * whatever session or key they still hold; as is the partner that owns the
 * workspace, for a partner key, so a workspace offboarded a moment ago is
 * out of its reach.
 */
export class ResolveMember extends Context.Service<
  ResolveMember,
  {
    readonly resolve: (
      principal: Principal,
      workspaceId: WorkspaceId
    ) => Effect.Effect<Actor, AccessDenied | DirectoryUnavailable>;
  }
>()("peal-server/workspace/application/ResolveMember") {
  static readonly layer = Layer.effect(
    ResolveMember,
    Effect.gen(function* resolveMember() {
      const directory = yield* MemberDirectory;
      const ownership = yield* PartnerOwnership;

      const resolve = Effect.fn("ResolveMember.resolve")(function* resolve(
        principal: Principal,
        workspaceId: WorkspaceId
      ) {
        const membership =
          principal._tag === "UserPrincipal"
            ? yield* directory.membership(principal.userId, workspaceId)
            : Option.none();

        const owner =
          principal._tag === "PartnerKeyPrincipal"
            ? yield* ownership
                .ownerOf(workspaceId)
                .pipe(
                  Effect.mapError(
                    ({ cause }) => new DirectoryUnavailable({ cause })
                  )
                )
            : Option.none();

        const now = yield* DateTime.now;

        return yield* Effect.fromResult(
          actorFor(
            principal,
            workspaceId,
            membership,
            now,
            owner.pipe(Option.map(({ partnerId }) => partnerId))
          )
        );
      });

      return ResolveMember.of({ resolve });
    })
  );
}
