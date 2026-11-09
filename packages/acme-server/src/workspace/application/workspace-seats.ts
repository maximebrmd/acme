import { Context, Effect, Layer, Option } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

import type { DirectoryUnavailable } from "./directory-unavailable.ts";
import { WorkspaceRoster } from "./workspace-roster.ts";

/**
 * How many members each workspace has, for billing to show against its
 * plan. Counts only, so it checks no permission: the caller has.
 */
export class WorkspaceSeats extends Context.Service<
  WorkspaceSeats,
  {
    readonly taken: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<number, DirectoryUnavailable>;
  }
>()("acme-server/workspace/application/WorkspaceSeats") {
  static readonly layer = Layer.effect(
    WorkspaceSeats,
    Effect.gen(function* WorkspaceSeatsLive() {
      const roster = yield* WorkspaceRoster;

      return WorkspaceSeats.of({
        taken: (workspaceId) =>
          roster.members(workspaceId).pipe(
            Effect.map((found) =>
              Option.match(found, {
                onNone: () => 0,
                onSome: ({ members }) => members.length,
              })
            ),
            Effect.withSpan("WorkspaceSeats.taken")
          ),
      });
    })
  );
}
