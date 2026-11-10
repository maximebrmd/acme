import { Layer } from "effect";

import { ReviewLinkHandlers } from "#review/api/review-link.ts";
import { ApprovalIntake } from "#review/application/approval-intake.ts";
import type { VisitorGuard } from "#review/application/ports/visitor-guard.ts";
import { PostReview } from "#review/application/post-review.ts";
import { PurgeReviewData } from "#review/application/purge-review-data.ts";
import { ReviewDesk } from "#review/application/review-desk.ts";
import { ReviewLinks } from "#review/application/review-links.ts";
import { ReviewSettings } from "#review/application/review-settings.ts";
import { VisitorReview } from "#review/application/visitor-review.ts";
import { DirectoryMemberNames } from "#review/infrastructure/directory-member-names.ts";
import { DrizzleApprovalStore } from "#review/infrastructure/drizzle-approval-store.ts";
import { DrizzleCommentStore } from "#review/infrastructure/drizzle-comment-store.ts";
import { DrizzleLinkStore } from "#review/infrastructure/drizzle-link-store.ts";
import { DrizzleReviewArchive } from "#review/infrastructure/drizzle-review-archive.ts";
import { DrizzleReviewRecords } from "#review/infrastructure/drizzle-review-records.ts";
import { DrizzleReviewSettingsStore } from "#review/infrastructure/drizzle-review-settings-store.ts";
import { LibraryMediaPreviews } from "#review/infrastructure/library-media-previews.ts";
import { LimitedVisitorGuard } from "#review/infrastructure/limited-visitor-guard.ts";
import { MailedVisitorReplies } from "#review/infrastructure/mailed-visitor-replies.ts";
import { NotifiedReviewOutcomes } from "#review/infrastructure/notified-review-outcomes.ts";
import { PublicLinkAddresses } from "#review/infrastructure/public-link-addresses.ts";
import { PublishingReviewedPosts } from "#review/infrastructure/publishing-reviewed-posts.ts";
import { ReviewApprovalGate } from "#review/infrastructure/review-approval-gate.ts";
import { ReviewVisitorLive } from "#review/infrastructure/review-visitor-live.ts";
import { SecureLinkTokens } from "#review/infrastructure/secure-link-tokens.ts";
import { webhookReviewOutcomes } from "#review/infrastructure/webhook-review-outcomes.ts";

// The review schema's tables, behind their ports.
const StoresLive = Layer.mergeAll(
  DrizzleApprovalStore,
  DrizzleCommentStore,
  DrizzleLinkStore,
  DrizzleReviewArchive,
  DrizzleReviewSettingsStore
);

/**
 * What publishing asks before it schedules a post (its ApprovalGate), from
 * the workspace's approval policy and the approvals recorded here, with
 * the records the workspace context exports and erases (ReviewRecords) and
 * the daily retention (PurgeReviewData). Built before publishing, which
 * needs the gate. Needs the database (Drizzle), a TransactionRunner, Ids
 * and the notifications context's Notify, which the composition root
 * brings.
 */
// What happens in a review, told to the members through the notices and to
// the workspace's webhook endpoints.
const ToldReviewOutcomes = webhookReviewOutcomes(NotifiedReviewOutcomes);

export const ReviewGateLive = Layer.mergeAll(
  ReviewApprovalGate,
  DrizzleReviewRecords,
  PurgeReviewData.layer
).pipe(
  Layer.provide(ApprovalIntake.layer),
  Layer.provide(ToldReviewOutcomes),
  Layer.provide(StoresLive)
);

/**
 * The review context's use cases, with `guard` before what visitors write:
 * the approval policy (ReviewSettings), links (ReviewLinks), a post's
 * review for members (PostReview) and for the holders of a link
 * (VisitorReview). Built after publishing, whose posts it shows and
 * releases (HeldPosts). Needs the database (Drizzle), a TransactionRunner
 * and Ids, with the channels context's ChannelRepository, the media
 * context's MediaForPlatforms, the workspace context's MemberDirectory and
 * the notifications context's Notify and SendVisitorEmail, which the
 * composition root brings.
 */
export const reviewWith = <E, R>(guard: Layer.Layer<VisitorGuard, E, R>) =>
  Layer.mergeAll(
    ReviewSettings.layer,
    ReviewLinks.layer,
    PostReview.layer,
    VisitorReview.layer
  ).pipe(
    Layer.provide(ReviewDesk.layer),
    Layer.provide(
      Layer.mergeAll(
        StoresLive,
        DirectoryMemberNames,
        LibraryMediaPreviews,
        MailedVisitorReplies,
        ToldReviewOutcomes,
        PublicLinkAddresses,
        PublishingReviewedPosts,
        SecureLinkTokens,
        guard
      )
    )
  );

/** The use cases as the server runs them: visitors' writes are limited. */
export const ReviewLive = reviewWith(LimitedVisitorGuard);

/** The review data's daily retention. Needs PurgeReviewData. */
export { ReviewRetentionCron as ReviewCronsLive } from "#review/infrastructure/crons.ts";

// The review endpoints of a workspace. They need the use cases ReviewLive
// provides, and the Authentication and WorkspaceAccess middleware of the
// workspace context, which the composition root brings.
export { ReviewHandlers as ReviewApiLive } from "#review/api/review.ts";

// The endpoints behind a review link, which need no sign-in, with what
// their requests pass first (ReviewVisitor).
export const ReviewLinkApiLive = ReviewLinkHandlers.pipe(
  Layer.provideMerge(ReviewVisitorLive)
);
