import { Effect, Ref } from "effect";
import type { Scope } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";

/** How many of a kind of work run at once, per workspace and in all. */
export interface SlotLimits {
  readonly perServer: number;
  readonly perWorkspace: number;
}

/** Takes a slot for the workspace, kept for the scope; false when none is free. */
export type TakeSlot = (
  workspaceId: WorkspaceId
) => Effect.Effect<boolean, never, Scope.Scope>;

/**
 * Slots counted in this process: the work runs where its request came, so
 * each server bounds its own memory and connections. A slot goes back when
 * the scope that took it closes, however it closes.
 */
export const countedSlots = (limits: SlotLimits): Effect.Effect<TakeSlot> =>
  Ref.make<ReadonlyMap<WorkspaceId, number>>(new Map()).pipe(
    Effect.map((running) => {
      const release = (workspaceId: WorkspaceId) =>
        Ref.update(running, (all) => {
          const left = (all.get(workspaceId) ?? 1) - 1;
          const next = new Map(all);

          if (left <= 0) {
            next.delete(workspaceId);
          } else {
            next.set(workspaceId, left);
          }

          return next;
        });

      return (workspaceId: WorkspaceId) =>
        Effect.acquireRelease(
          Ref.modify(running, (all) => {
            const mine = all.get(workspaceId) ?? 0;
            const total = [...all.values()].reduce((sum, n) => sum + n, 0);

            return mine >= limits.perWorkspace || total >= limits.perServer
              ? ([false, all] as const)
              : ([true, new Map(all).set(workspaceId, mine + 1)] as const);
          }),
          (taken) => (taken ? release(workspaceId) : Effect.void)
        );
    })
  );
