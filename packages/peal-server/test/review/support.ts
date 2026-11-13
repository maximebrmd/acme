import { Context, Effect, Layer, Option, Ref } from "effect";
import type { Scope } from "effect";

import { PostEvents } from "#publishing/application/post-events.ts";
import { ApprovalIntake } from "#review/application/approval-intake.ts";
import { ApprovalStore } from "#review/application/ports/approval-store.ts";
import { MediaPreviews } from "#review/application/ports/media-previews.ts";
import { MemberNames } from "#review/application/ports/member-names.ts";
import { ReviewOutcomes } from "#review/application/ports/review-outcomes.ts";
import { VisitorGuard } from "#review/application/ports/visitor-guard.ts";
import { PostReview } from "#review/application/post-review.ts";
import { PurgeReviewData } from "#review/application/purge-review-data.ts";
import { ReviewDesk } from "#review/application/review-desk.ts";
import { ReviewLinks } from "#review/application/review-links.ts";
import { ReviewSettings } from "#review/application/review-settings.ts";
import { VisitorReview } from "#review/application/visitor-review.ts";
import type { VisitorIdentity } from "#review/application/visitor-review.ts";
import type { ApprovalPolicy } from "#review/domain/approval-policy.ts";
import type { ShownRequest } from "#review/domain/approval-request.ts";
import { DrizzleApprovalStore } from "#review/infrastructure/drizzle-approval-store.ts";
import { DrizzleCommentStore } from "#review/infrastructure/drizzle-comment-store.ts";
import { DrizzleLinkStore } from "#review/infrastructure/drizzle-link-store.ts";
import { DrizzleReviewArchive } from "#review/infrastructure/drizzle-review-archive.ts";
import { DrizzleReviewRecords } from "#review/infrastructure/drizzle-review-records.ts";
import { DrizzleReviewSettingsStore } from "#review/infrastructure/drizzle-review-settings-store.ts";
import { PublicLinkAddresses } from "#review/infrastructure/public-link-addresses.ts";
import { PublishingReviewedPosts } from "#review/infrastructure/publishing-reviewed-posts.ts";
import { ReviewApprovalGate } from "#review/infrastructure/review-approval-gate.ts";
import { SecureLinkTokens } from "#review/infrastructure/secure-link-tokens.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { Actor } from "#shared/domain/access.ts";
import type { Permission } from "#shared/domain/access.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { PostId, UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { setTime } from "#test/publishing/infrastructure/harness.ts";
import { postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  actorAs,
  attachableMedia,
  postAllowance,
} from "#test/publishing/support.ts";
import { Heard } from "#test/review/heard.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// The review context over Postgres, with publishing as the server runs it
// on an in-memory cluster (test/publishing/posts-server.ts): the gate, the
// stores and the use cases are the real ones; what reaches other contexts
// (notices, mail, media, members' names) is recorded or stood in for.

/** An outcome the review told, by kind, and the key it was told under. */
export interface ToldOutcome {
  readonly key: string;
  readonly kind:
    | "approvalRequested"
    | "approved"
    | "changesRequested"
    | "commented"
    | "settled";
}

/** What the review told the rest of Peal. */
export class Told extends Context.Service<
  Told,
  {
    readonly outcomes: Effect.Effect<readonly ToldOutcome[]>;
  }
>()("test/review/Told") {}

const Recording = Layer.effectContext(
  Effect.gen(function* Recording() {
    const outcomes = yield* Ref.make<readonly ToldOutcome[]>([]);

    const tell =
      (kind: ToldOutcome["kind"]) =>
      ({ key }: { readonly key: string }) =>
        Ref.update(outcomes, (told) => [...told, { key, kind }]);

    return Context.make(
      ReviewOutcomes,
      ReviewOutcomes.of({
        approvalRequested: tell("approvalRequested"),
        approved: tell("approved"),
        changesRequested: tell("changesRequested"),
        commented: tell("commented"),
        settled: (key) => tell("settled")({ key }),
      })
    ).pipe(Context.add(Told, Told.of({ outcomes: Ref.get(outcomes) })));
  })
);

// PostEvents that keeps what it is told, as the webhooks would be.
const Hearing = Layer.effectContext(
  Effect.gen(function* Hearing() {
    const heard = yield* Ref.make<readonly (readonly [string, PostId])[]>([]);

    const hear = (kind: string) => (post: { readonly id: PostId }) =>
      Ref.update(heard, (events) => [...events, [kind, post.id] as const]);

    return Context.make(
      PostEvents,
      PostEvents.of({
        cancelled: hear("cancelled"),
        confirmed: hear("confirmed"),
        dropped: hear("dropped"),
        finished: hear("finished"),
        scheduled: hear("scheduled"),
        unscheduled: hear("unscheduled"),
      })
    ).pipe(Context.add(Heard, Heard.of({ events: Ref.get(heard) })));
  })
);

const Stores = Layer.mergeAll(
  DrizzleApprovalStore,
  DrizzleCommentStore,
  DrizzleLinkStore,
  DrizzleReviewArchive,
  DrizzleReviewSettingsStore
);

// Every file a post shows has a preview, at an address of the test's.
const Previews = Layer.succeed(
  MediaPreviews,
  MediaPreviews.of({
    of: (_workspaceId, mediaId) =>
      Effect.succeed(
        Option.some({
          contentType: "image/jpeg",
          kind: "image" as const,
          url: `https://media.example.test/${mediaId}`,
        })
      ),
  })
);

const Gate = Layer.mergeAll(
  ReviewApprovalGate,
  DrizzleReviewRecords,
  PurgeReviewData.layer
).pipe(
  Layer.provide(ApprovalIntake.layer),
  Layer.provideMerge(Layer.mergeAll(Stores, Recording))
);

/** The review use cases, with `guard` before what visitors write. */
export const reviewServerWith = <E, R>(
  guard: Layer.Layer<VisitorGuard, E, R>,
  allowance: ReturnType<typeof postAllowance> = postAllowance()
) =>
  Layer.mergeAll(
    ReviewSettings.layer,
    ReviewLinks.layer,
    PostReview.layer,
    VisitorReview.layer
  ).pipe(
    Layer.provide(ReviewDesk.layer),
    Layer.provide(
      Layer.mergeAll(
        MemberNames.none,
        Previews,
        PublicLinkAddresses,
        PublishingReviewedPosts,
        SecureLinkTokens,
        guard
      )
    ),
    Layer.provideMerge(
      postsServerBehind(Gate, attachableMedia(), allowance, Hearing)
    )
  );

export const ReviewServerTest = reviewServerWith(VisitorGuard.open);

/** Runs `test` on a fresh server at virtual time `start`. */
export const onReviewServerAt = <A, E>(
  start: string,
  test: Effect.Effect<
    A,
    E,
    Layer.Success<typeof ReviewServerTest> | Scope.Scope
  >
) =>
  setTime(start).pipe(
    Effect.andThen(test.pipe(Effect.provide(ReviewServerTest)))
  );

/** Gives the workspace an approval policy, as an owner would. */
export const withPolicy = (workspaceId: WorkspaceId, policy: ApprovalPolicy) =>
  ReviewSettings.use((settings) =>
    settings.setPolicy(
      actorAs(
        UserIdSchema.make("5b1c5f7e-3d2a-4c1b-9e8f-00000000000a"),
        workspaceId,
        permissionsFor("owner")
      ),
      policy
    )
  );

/** A member acting through an OAuth client, such as the command line. */
export const throughClient = (
  userId: UserId,
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("editor")
): Actor =>
  new Actor({
    permissions,
    subject: {
      _tag: "user",
      clientId: "synthetic-client",
      impersonatedBy: Option.none(),
      userId,
    },
    workspaceId,
  });

/** Staff acting as a member. */
export const impersonating = (
  staffId: UserId,
  userId: UserId,
  workspaceId: WorkspaceId,
  permissions: readonly Permission[] = permissionsFor("owner")
): Actor =>
  new Actor({
    permissions,
    subject: { _tag: "user", impersonatedBy: Option.some(staffId), userId },
    workspaceId,
  });

/**
 * The approval a post's reviewers are shown now: its latest request, with
 * what the post said when it was asked.
 */
export const shown = ({
  id,
  workspaceId,
}: {
  readonly id: PostId;
  readonly workspaceId: WorkspaceId;
}): Effect.Effect<ShownRequest, DatabaseError, ApprovalStore> =>
  ApprovalStore.use((requests) => requests.ofPost(workspaceId, id)).pipe(
    Effect.map(([latest]) => ({
      requestId: latest?.id ?? "none",
      subjectHash: latest?.subjectHash ?? "none",
    }))
  );

/** A visitor as the public endpoints see one. */
export const visitor = (name = "Ada Lovelace"): VisitorIdentity => ({
  address: "203.0.113.7",
  captchaToken: Option.none(),
  name,
});
