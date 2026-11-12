import { Effect, Layer } from "effect";

import { AssistantRequests } from "#assistant/application/assistant-requests.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import type {
  Seated,
  Usage,
} from "#billing/application/ports/workspace-usage.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { MediaStorageUsage } from "#media/application/media-storage-usage.ts";
import { PostUsage } from "#publishing/application/post-usage.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

/**
 * A workspace's usage, counted by the context that holds each thing: its
 * channels, its members, the posts going out this month, the assistant
 * requests sent today and the media it stores. The member directory not answering is the database
 * not answering.
 */
export const ContextWorkspaceUsageLive = Layer.effect(
  WorkspaceUsage,
  Effect.gen(function* ContextWorkspaceUsageLive() {
    const channels = yield* ChannelUsage;
    const posts = yield* PostUsage;
    const seats = yield* WorkspaceSeats;
    const assistant = yield* AssistantRequests;
    const media = yield* MediaStorageUsage;

    const of = Effect.fn("WorkspaceUsage.of")(function* of(
      workspaceId: WorkspaceId
    ) {
      const counted = yield* Effect.all(
        {
          assistant: assistant.today(workspaceId),
          channels: channels.connected(workspaceId),
          media: media.stored(workspaceId),
          members: seats
            .taken(workspaceId)
            .pipe(Effect.mapError(({ cause }) => new DatabaseError({ cause }))),
          posts: posts.thisMonth(workspaceId),
        },
        { concurrency: "unbounded" }
      );

      const usage: Usage = {
        assistantRequests: counted.assistant,
        channels: counted.channels,
        mediaStorage: counted.media,
        members: counted.members,
        scheduledPosts: {
          resetsAt: counted.posts.resetsAt,
          used: counted.posts.scheduled,
        },
      };

      return usage;
    });

    const heldIn = Effect.fn("WorkspaceUsage.heldIn")(function* heldIn(
      workspaceIds: readonly WorkspaceId[]
    ) {
      const counted = yield* Effect.all(
        {
          channels: channels.connectedAcross(workspaceIds),
          members: seats
            .takenIn(workspaceIds)
            .pipe(Effect.mapError(({ cause }) => new DatabaseError({ cause }))),
        },
        { concurrency: "unbounded" }
      );

      return new Map(
        workspaceIds.map((id): [WorkspaceId, Seated] => [
          id,
          {
            channels: counted.channels.get(id) ?? 0,
            members: counted.members.get(id) ?? 0,
          },
        ])
      );
    });

    return WorkspaceUsage.of({ heldIn, of });
  })
);
