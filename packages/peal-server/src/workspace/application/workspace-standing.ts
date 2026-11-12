import { Context, DateTime, Effect, Layer, Option } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import { isBanned } from "#workspace/domain/ban.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { WorkspaceRoster } from "./workspace-roster.ts";

/**
 * Whether a workspace is in good standing, for what it shows the public
 * (its short links): it exists, and staff have not banned every account
 * that owns it. A workspace with no member, which a partner owns, stands
 * as its partner's keys do.
 */
export class WorkspaceStanding extends Context.Service<
  WorkspaceStanding,
  {
    readonly isActive: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DirectoryUnavailable>;
  }
>()("peal-server/workspace/application/WorkspaceStanding") {
  static readonly layer = Layer.effect(
    WorkspaceStanding,
    Effect.gen(function* WorkspaceStandingLive() {
      const roster = yield* WorkspaceRoster;

      const isActive = Effect.fn("WorkspaceStanding.isActive")(
        function* isActive(workspaceId: WorkspaceId) {
          const found = yield* roster.members(workspaceId);
          const now = yield* DateTime.now;

          if (Option.isNone(found)) {
            return false;
          }

          const owners = found.value.members.filter((member) =>
            permissionsFor(member.role).includes("organization:delete")
          );

          return (
            owners.length === 0 ||
            owners.some((owner) => !isBanned(owner.ban, now))
          );
        }
      );

      return WorkspaceStanding.of({ isActive });
    })
  );
}
