import { DateTime, Effect, Layer } from "effect";

import { AssistantRequests } from "#assistant/application/assistant-requests.ts";
import { UsageStates } from "#billing/application/ports/usage-states.ts";
import type { WorkspaceDayState } from "#billing/application/ports/usage-states.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { MediaStorageUsage } from "#media/application/media-storage-usage.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

/**
 * Every workspace's states, a page at a time: the workspace context pages
 * through the workspaces with their members, then the channels, media and
 * assistant contexts count the page's, one query each. The member
 * directory not answering is the database not answering.
 */
export const ContextUsageStatesLive = Layer.effect(
  UsageStates,
  Effect.gen(function* ContextUsageStatesLive() {
    const seats = yield* WorkspaceSeats;
    const channels = yield* ChannelUsage;
    const media = yield* MediaStorageUsage;
    const assistant = yield* AssistantRequests;

    return UsageStates.of({
      page: Effect.fn("UsageStates.page")(function* page({
        after,
        createdBefore,
        day,
        limit,
      }) {
        const workspaces = yield* seats
          .page({ after, createdBefore, limit })
          .pipe(Effect.mapError(({ cause }) => new DatabaseError({ cause })));

        const ids = workspaces.map(({ workspaceId }) => workspaceId);
        const { day: dayOfMonth, month, year } = DateTime.toPartsUtc(day);

        const counted = yield* Effect.all(
          {
            channels: channels.connectedIn(ids),
            media: media.storedIn(ids),
            requests: assistant.onDay(ids, { day: dayOfMonth, month, year }),
          },
          { concurrency: "unbounded" }
        );

        return workspaces.map(
          ({ members, workspaceId }): WorkspaceDayState => ({
            assistantRequests: counted.requests.get(workspaceId) ?? 0,
            channels: counted.channels.get(workspaceId) ?? 0,
            mediaStorage: counted.media.get(workspaceId) ?? 0,
            members,
            workspaceId,
          })
        );
      }),
      workspaces: ({ after, createdBefore, limit }) =>
        seats.page({ after, createdBefore, limit }).pipe(
          Effect.map((found) => found.map(({ workspaceId }) => workspaceId)),
          Effect.mapError(({ cause }) => new DatabaseError({ cause }))
        ),
    });
  })
);
