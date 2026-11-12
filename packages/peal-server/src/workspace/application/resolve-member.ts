import { Context, DateTime, Effect, Layer, Option, Result } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { actorFor } from "#workspace/domain/membership.ts";
import type { AccessDenied } from "#workspace/domain/membership.ts";
import type { Principal } from "#workspace/domain/principal.ts";

import { DirectoryUnavailable } from "./directory-unavailable.ts";
import { MemberDirectory } from "./member-directory.ts";
import { PartnerOwnership } from "./partner-ownership.ts";

// A refusal, kept as one of the answers rather than failing them all.
const denied = (refusal: AccessDenied) =>
  Effect.succeed(Result.fail<AccessDenied>(refusal));

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
    /**
     * The actor the principal is in each of these workspaces, or why not,
     * decided by `actorFor` as `resolve` decides one, from one read of the
     * memberships for a user.
     */
    readonly resolveMany: (
      principal: Principal,
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<
      ReadonlyMap<WorkspaceId, Result.Result<Actor, AccessDenied>>,
      DirectoryUnavailable
    >;
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

      const resolveMany = Effect.fn("ResolveMember.resolveMany")(
        function* resolveMany(
          principal: Principal,
          workspaceIds: readonly WorkspaceId[]
        ) {
          // Keys belong to one workspace, or to a partner's: one at a time.
          if (principal._tag !== "UserPrincipal") {
            const decided = yield* Effect.forEach(
              workspaceIds,
              (workspaceId) =>
                resolve(principal, workspaceId).pipe(
                  Effect.map((actor): Result.Result<Actor, AccessDenied> =>
                    Result.succeed(actor)
                  ),
                  Effect.catchTags({
                    BannedUser: denied,
                    NotAMember: denied,
                    TwoStepRequired: denied,
                    WorkspaceMismatch: denied,
                  }),
                  Effect.map((result) => [workspaceId, result] as const)
                ),
              { concurrency: 8 }
            );

            return new Map(decided);
          }

          const memberships = yield* directory.memberships(
            principal.userId,
            workspaceIds
          );

          const now = yield* DateTime.now;

          return new Map(
            workspaceIds.map((workspaceId) => [
              workspaceId,
              actorFor(
                principal,
                workspaceId,
                Option.fromUndefinedOr(memberships.get(workspaceId)),
                now
              ),
            ])
          );
        }
      );

      return ResolveMember.of({ resolve, resolveMany });
    })
  );
}
