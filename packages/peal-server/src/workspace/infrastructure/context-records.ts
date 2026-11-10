import { Effect, Layer } from "effect";

import { ActivityRecords } from "#activity/application/activity-records.ts";
import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { UsageRecords } from "#assistant/application/ports/usage-records.ts";
import { BillingRecords } from "#billing/application/billing-records.ts";
import type { WorkspaceStillBilled } from "#billing/application/workspace-still-billed.ts";
import { ChannelRecords } from "#channels/application/channel-records.ts";
import { EngagementRecords } from "#engagement/application/engagement-records.ts";
import { LegalRecords } from "#legal/application/legal-records.ts";
import { MediaRecords } from "#media/application/media-records.ts";
import { NoticeRecords } from "#notifications/application/notice-records.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { ReviewRecords } from "#review/application/review-records.ts";
import { Pseudonyms } from "#shared/application/pseudonyms.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { StaffRecords } from "#staff/application/staff-records.ts";
import { WebhookRecords } from "#webhooks/application/webhook-records.ts";
import { BillingUnavailable } from "#workspace/application/billing-unavailable.ts";
import { ContextRecords } from "#workspace/application/context-records.ts";
import type { ErasedWorkspace } from "#workspace/application/context-records.ts";
import { WorkspaceBusy } from "#workspace/application/workspace-busy.ts";
import { WorkspaceFilesRemain } from "#workspace/application/workspace-files-remain.ts";
import { WorkspaceSubscribed } from "#workspace/application/workspace-subscribed.ts";

// A post of the workspace is going out.
const busy = ({ workspaceId }: { readonly workspaceId: WorkspaceId }) =>
  Effect.fail(new WorkspaceBusy({ workspaceId }));

// Billing's refusals, as the workspace context answers them.
const billingRefusals = (workspaceId: WorkspaceId) => ({
  StripeUnreachable: () => Effect.fail(new BillingUnavailable({ workspaceId })),
  WorkspaceStillBilled: ({ subscriptions }: WorkspaceStillBilled) =>
    Effect.fail(
      new WorkspaceSubscribed({
        subscriptions: subscriptions.map((subscription) => ({
          ...subscription,
          workspaceId,
        })),
      })
    ),
});

/**
 * ContextRecords through each context's own records: publishing's posts,
 * the channels, the media library, the notices, the assistant's usage,
 * analytics' posts followed, engagement's threads, billing's
 * subscriptions, the webhooks, the activity logs, the staff audit log, the
 * legal records, and the reviews of posts.
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
    const analytics = yield* AnalyticsRecords;
    const staff = yield* StaffRecords;
    const legal = yield* LegalRecords;
    const reviews = yield* ReviewRecords;
    const webhooks = yield* WebhookRecords;
    const activity = yield* ActivityRecords;
    const engagement = yield* EngagementRecords;
    const pseudonyms = yield* Pseudonyms;

    return ContextRecords.of({
      eraseUser: Effect.fn("ContextRecords.eraseUser")(
        function* eraseUser(userId, email) {
          const pseudonym = yield* pseudonyms.ofEmail(email);

          yield* notices.eraseUser(userId);
          yield* posts.forgetAuthor(userId);
          yield* engagement.forgetUser(userId);
          yield* reviews.forgetUser(userId);
          yield* channels.eraseUser(userId);
          yield* activity.forgetUser(userId);
          yield* staff.forgetUser(userId, pseudonym);
          yield* billing.forgetUser(userId, pseudonym);
        }
      ),
      eraseWorkspace: Effect.fn("ContextRecords.eraseWorkspace")(
        function* eraseWorkspace(workspaceId) {
          // Posts first: they stop the jobs that would post to the
          // channels, and refuse while one is going out.
          yield* posts
            .eraseWorkspace(workspaceId)
            .pipe(Effect.catchTag("PostsPublishing", busy));

          yield* reviews.eraseWorkspace(workspaceId);
          yield* analytics.eraseWorkspace(workspaceId);
          yield* engagement.eraseWorkspace(workspaceId);
          yield* channels.eraseWorkspace(workspaceId);
          yield* media.eraseWorkspace(workspaceId);
          yield* notices.eraseWorkspace(workspaceId);
          yield* usage.eraseWorkspace(workspaceId);
          yield* webhooks.eraseWorkspace(workspaceId);
          yield* activity.eraseWorkspace(workspaceId);

          // Billing last: refused if Stripe still bills it, which settling
          // made sure it no longer does, unless a checkout completed since.
          yield* billing
            .eraseWorkspace(workspaceId)
            .pipe(Effect.catchTags(billingRefusals(workspaceId)));
        }
      ),
      exportAuthoredPosts: (userId, workspaceIds) =>
        posts.exportAuthored(userId, workspaceIds),
      exportUser: (userId) =>
        Effect.all({
          activity: activity.exportUser(userId),
          contracts: billing.exportUser(userId),
          legalHold: legal.exportUser(userId),
          replies: engagement.exportUser(userId),
          review: reviews.exportUser(userId),
          staffActions: staff.exportUser(userId),
          user: notices.exportUser(userId),
        }).pipe(
          Effect.map((exported) => ({
            ...exported.user,
            activity: exported.activity,
            contracts: exported.contracts,
            legalHold: exported.legalHold,
            replies: exported.replies,
            review: exported.review,
            staffActions: exported.staffActions,
          }))
        ),
      exportWorkspace: (workspaceId) =>
        Effect.all({
          accountAnalytics: analytics.exportAccounts(workspaceId),
          analytics: analytics.exportWorkspace(workspaceId),
          assistantUsage: usage.exportWorkspace(workspaceId),
          billing: billing.exportWorkspace(workspaceId),
          channels: channels.exportWorkspace(workspaceId),
          media: media.exportWorkspace(workspaceId),
          posts: posts.exportWorkspace(workspaceId),
          review: reviews.exportWorkspace(workspaceId),
          webhooks: webhooks.exportWorkspace(workspaceId),
        }),
      holdIdentification: (record, closedAt) => legal.hold(record, closedAt),
      legalRemains: (userId) => legal.afterClosure(userId),
      removeWorkspaceFiles: (workspaceId) =>
        media
          .removeWorkspaceFiles(workspaceId)
          .pipe(
            Effect.mapError(
              (cause) => new WorkspaceFilesRemain({ cause, workspaceId })
            )
          ),
      settleWorkspaces: Effect.fn("ContextRecords.settleWorkspaces")(
        function* settleWorkspaces(workspaceIds, options) {
          // Everything that may refuse first, so nothing is cancelled for a
          // deletion that is then refused: a post going out, and, without
          // the person's agreement, any subscription of any of them, all
          // listed together for the person to read.
          yield* Effect.forEach(
            workspaceIds,
            (workspaceId) =>
              posts
                .ensureErasable(workspaceId)
                .pipe(Effect.catchTag("PostsPublishing", busy)),
            { discard: true }
          );

          if (!options.cancelSubscriptions) {
            const billed = yield* Effect.all(
              workspaceIds.map((workspaceId) =>
                billing.billedBy(workspaceId).pipe(
                  Effect.map((subscriptions) =>
                    subscriptions.map((subscription) => ({
                      ...subscription,
                      workspaceId,
                    }))
                  )
                )
              )
            );

            if (billed.flat().length > 0) {
              return yield* new WorkspaceSubscribed({
                subscriptions: billed.flat(),
              });
            }
          }

          const settled = yield* Effect.all(
            workspaceIds.map((workspaceId) =>
              billing
                .settleWorkspace(workspaceId, options)
                .pipe(Effect.catchTags(billingRefusals(workspaceId)))
            )
          );

          const erased: ErasedWorkspace = {
            subscriptionsCancelled: settled.reduce(
              (sum, { subscriptionsCancelled }) => sum + subscriptionsCancelled,
              0
            ),
          };

          return erased;
        }
      ),
    });
  })
);
