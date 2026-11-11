import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { AssistantRequests } from "#assistant/application/assistant-requests.ts";
import { UsageStates } from "#billing/application/ports/usage-states.ts";
import { ContextUsageStatesLive } from "#billing/infrastructure/context-usage-states.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { MediaStorageUsage } from "#media/application/media-storage-usage.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { LocalDate } from "#shared/domain/wall-clock.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

const busy = WorkspaceIdSchema.make("1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d");

const idle = WorkspaceIdSchema.make("2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e");

const createdBefore = DateTime.makeUnsafe("2026-11-11T00:00:00Z");

const days = Ref.makeUnsafe<readonly LocalDate[]>([]);

const StatesTest = ContextUsageStatesLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      Layer.mock(WorkspaceSeats, {
        page: (request) =>
          Effect.succeed(
            request.limit === 2 &&
              Option.isNone(request.after) &&
              DateTime.Equivalence(request.createdBefore, createdBefore)
              ? [
                  { members: 3, workspaceId: busy },
                  { members: 1, workspaceId: idle },
                ]
              : []
          ),
      }),
      Layer.mock(ChannelUsage, {
        connectedIn: (ids) =>
          Effect.succeed(new Map(ids.includes(busy) ? [[busy, 4]] : [])),
      }),
      Layer.mock(MediaStorageUsage, {
        storedIn: (ids) =>
          Effect.succeed(
            new Map(ids.includes(busy) ? [[busy, 7_000_000_000]] : [])
          ),
      }),
      Layer.mock(AssistantRequests, {
        onDay: (ids, day) =>
          Ref.update(days, (all) => [...all, day]).pipe(
            Effect.as(new Map(ids.includes(busy) ? [[busy, 12]] : []))
          ),
      })
    )
  )
);

layer(StatesTest)("the workspaces' states, from the contexts", (it) => {
  it.effect(
    "count each page's channels, media and the day's requests, none where a context has none",
    () =>
      Effect.gen(function* states() {
        const page = yield* UsageStates.use((usage) =>
          usage.page({
            after: Option.none(),
            createdBefore,
            day: DateTime.makeUnsafe("2026-11-10T00:00:00Z"),
            limit: 2,
          })
        );

        assert.deepStrictEqual(page, [
          {
            assistantRequests: 12,
            channels: 4,
            mediaStorage: 7_000_000_000,
            members: 3,
            workspaceId: busy,
          },
          {
            assistantRequests: 0,
            channels: 0,
            mediaStorage: 0,
            members: 1,
            workspaceId: idle,
          },
        ]);
        assert.deepStrictEqual(yield* Ref.get(days), [
          { day: 10, month: 11, year: 2026 },
        ]);
      })
  );
});
