import { Effect, Layer } from "effect";

import { UsageRecords } from "#assistant/application/ports/usage-records.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import { ChannelRecords } from "#channels/application/channel-records.ts";
import { MediaRecords } from "#media/application/media-records.ts";
import { NoticeRecords } from "#notifications/application/notice-records.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { ContextRecords } from "#workspace/application/context-records.ts";
import { WorkspaceBusy } from "#workspace/application/workspace-busy.ts";
import { WorkspaceFilesRemain } from "#workspace/application/workspace-files-remain.ts";
import { WorkspaceSubscribed } from "#workspace/application/workspace-subscribed.ts";

/**
 * ContextRecords through each context's own records: publishing's posts,
 * the channels, the media library, the notices, the assistant's usage and
 * billing's subscriptions.
 */
export const ContextRecordsLive = Layer.effect(
  ContextRecords,
  Effect.gen(function* ContextRecordsLive() {
    const channels = yield* ChannelRecords;
    const posts = yield* PostRecords;
    const media = yield* MediaRecords;
    const notices = yield* NoticeRecords;
    const usage = yield* UsageRecords;
    const billing = yield* BillingRecords;

    return ContextRecords.of({
      eraseUser: Effect.fn("ContextRecords.eraseUser")(
        function* eraseUser(userId) {
          yield* notices.eraseUser(userId);
          yield* posts.forgetAuthor(userId);
        }
      ),
      eraseWorkspace: Effect.fn("ContextRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          // Billing first: a workspace Stripe may still bill is refused
          // before anything of it goes.
          yield* billing
            .eraseWorkspace(workspaceId)
            .pipe(
              Effect.catchTag("WorkspaceStillBilled", () =>
                Effect.fail(new WorkspaceSubscribed({ workspaceId }))
              )
            );

          // Then posts: they stop the jobs that would post to the
          // channels, and refuse while one is going out.
          yield* posts
            .eraseWorkspace(workspaceId)
            .pipe(
              Effect.catchTag("PostsPublishing", () =>
                Effect.fail(new WorkspaceBusy({ workspaceId }))
              )
            );

          yield* channels.eraseWorkspace(workspaceId);
          yield* media.eraseWorkspace(workspaceId);
          yield* notices.eraseWorkspace(workspaceId);
          yield* usage.eraseWorkspace(workspaceId);
        }
      ),
      exportAuthoredPosts: (userId, workspaceIds) =>
        posts.exportAuthored(userId, workspaceIds),
      exportUser: (userId) => notices.exportUser(userId),
      exportWorkspace: (workspaceId) =>
        Effect.all({
          assistantUsage: usage.exportWorkspace(workspaceId),
          billing: billing.exportWorkspace(workspaceId),
          channels: channels.exportWorkspace(workspaceId),
          media: media.exportWorkspace(workspaceId),
          posts: posts.exportWorkspace(workspaceId),
        }),
      removeWorkspaceFiles: (workspaceId) =>
        media
          .removeWorkspaceFiles(workspaceId)
          .pipe(
            Effect.mapError(
              (cause) => new WorkspaceFilesRemain({ cause, workspaceId })
            )
          ),
    });
  })
);
