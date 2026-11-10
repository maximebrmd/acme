import { Effect, Layer, Ref } from "effect";

import { ImportSlots } from "#media/application/ports/import-slots.ts";
import { importsAtOnce } from "#media/domain/import-limits.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * ImportSlots counted in this process: the imports run where their request
 * came, so each server bounds its own memory and connections.
 */
export const CountedImportSlots = Layer.effect(
  ImportSlots,
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

      return ImportSlots.of({
        take: (workspaceId) =>
          Effect.acquireRelease(
            Ref.modify(running, (all) => {
              const mine = all.get(workspaceId) ?? 0;
              const total = [...all.values()].reduce((sum, n) => sum + n, 0);

              return mine >= importsAtOnce.perWorkspace ||
                total >= importsAtOnce.perServer
                ? ([false, all] as const)
                : ([true, new Map(all).set(workspaceId, mine + 1)] as const);
            }),
            (taken) => (taken ? release(workspaceId) : Effect.void)
          ),
      });
    })
  )
);
