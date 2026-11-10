import { Clock, Effect, Layer, Ref } from "effect";

import type { WorkspaceId } from "#shared/domain/ids.ts";
import { ManualSends } from "#webhooks/application/ports/manual-sends.ts";
import { manualSendsPerHour } from "#webhooks/domain/delivery-policy.ts";

const hour = 3_600_000;

interface Window {
  readonly sent: number;
  readonly startedAt: number;
}

/**
 * ManualSends counted in this process, by workspace, in windows of an hour
 * from a workspace's first send: one server runs the deliveries, and a
 * restart gives each workspace its hour again, which costs little. Windows
 * that ended are dropped as others are counted.
 */
export const WindowedManualSends = Layer.effect(
  ManualSends,
  Ref.make<ReadonlyMap<WorkspaceId, Window>>(new Map()).pipe(
    Effect.map((windows) =>
      ManualSends.of({
        take: (workspaceId) =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) =>
              Ref.modify(windows, (all) => {
                const open = new Map(
                  [...all].filter(([, { startedAt }]) => now - startedAt < hour)
                );

                const current = open.get(workspaceId) ?? {
                  sent: 0,
                  startedAt: now,
                };

                if (current.sent >= manualSendsPerHour) {
                  return [false, open] as const;
                }

                return [
                  true,
                  open.set(workspaceId, { ...current, sent: current.sent + 1 }),
                ] as const;
              })
            )
          ),
      })
    )
  )
);
