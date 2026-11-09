import { Effect, Layer } from "effect";

import { AssistantRequests } from "#assistant/application/assistant-requests.ts";
import { WorkspaceUsage } from "#billing/application/ports/workspace-usage.ts";
import type { Usage } from "#billing/application/ports/workspace-usage.ts";
import { ChannelUsage } from "#channels/application/channel-usage.ts";
import { PostUsage } from "#publishing/application/post-usage.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { WorkspaceSeats } from "#workspace/application/workspace-seats.ts";

/**
 * A workspace's usage, counted by the context that holds each thing: its
 * channels, its members, the posts going out this month and the assistant
 * requests sent today. The member directory not answering is the database
 * not answering.
 */
export const ContextWorkspaceUsageLive = Layer.effect(
  WorkspaceUsage,
  Effect.gen(function* ContextWorkspaceUsageLive() {
    const channels = yield* ChannelUsage;
    const posts = yield* PostUsage;
    const seats = yield* WorkspaceSeats;
    const assistant = yield* AssistantRequests;

    const of = Effect.fn("WorkspaceUsage.of")(function* of(
      workspaceId: WorkspaceId
    ) {
      const counted = yield* Effect.all(
        {
          assistant: assistant.today(workspaceId),
          channels: channels.connected(workspaceId),
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
        members: counted.members,
        scheduledPosts: {
          resetsAt: counted.posts.resetsAt,
          used: counted.posts.scheduled,
        },
      };

      return usage;
    });

    return WorkspaceUsage.of({ of });
  })
);
