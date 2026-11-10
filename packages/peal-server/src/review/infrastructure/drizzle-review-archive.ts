import { and, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { ReviewArchive } from "#review/application/ports/review-archive.ts";
import type { ReviewCutoffs } from "#review/domain/review-retention.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, failed } from "./rows.ts";
import { approvalRequests, comments, links, settings } from "./schema.ts";

/** What ends the review schema's rows. */
export const DrizzleReviewArchive = Layer.effect(
  ReviewArchive,
  Effect.gen(function* DrizzleReviewArchive() {
    const db = yield* Drizzle;

    const deletePost = Effect.fn("ReviewArchive.deletePost")(
      function* deletePost(workspaceId: string, postId: string) {
        yield* db
          .delete(comments)
          .where(
            and(
              eq(comments.workspaceId, workspaceId),
              eq(comments.postId, postId)
            )
          );
        yield* db
          .delete(approvalRequests)
          .where(
            and(
              eq(approvalRequests.workspaceId, workspaceId),
              eq(approvalRequests.postId, postId)
            )
          );
      },
      Effect.mapError(failed)
    );

    const deleteWorkspace = Effect.fn("ReviewArchive.deleteWorkspace")(
      function* deleteWorkspace(workspaceId: string) {
        yield* db.delete(comments).where(eq(comments.workspaceId, workspaceId));
        yield* db
          .delete(approvalRequests)
          .where(eq(approvalRequests.workspaceId, workspaceId));
        yield* db.delete(links).where(eq(links.workspaceId, workspaceId));
        yield* db.delete(settings).where(eq(settings.workspaceId, workspaceId));
      },
      Effect.mapError(failed)
    );

    const forgetUser = Effect.fn("ReviewArchive.forgetUser")(
      function* forgetUser(userId: string) {
        yield* db
          .update(comments)
          .set({ authorUserId: null })
          .where(eq(comments.authorUserId, userId));
        yield* db
          .update(comments)
          .set({ resolvedByUserId: null })
          .where(eq(comments.resolvedByUserId, userId));
        yield* db
          .update(approvalRequests)
          .set({ requestedBy: null })
          .where(eq(approvalRequests.requestedBy, userId));
        yield* db
          .update(approvalRequests)
          .set({ decidedByUserId: null })
          .where(eq(approvalRequests.decidedByUserId, userId));
        yield* db
          .update(links)
          .set({ createdBy: null })
          .where(eq(links.createdBy, userId));
        yield* db
          .update(settings)
          .set({ updatedBy: null })
          .where(eq(settings.updatedBy, userId));
      },
      Effect.mapError(failed)
    );

    const purge = Effect.fn("ReviewArchive.purge")(function* purge(
      cutoffs: ReviewCutoffs,
      limit: number
    ) {
      const old = date(cutoffs.namesBefore);

      const commentNames = yield* db
        .update(comments)
        .set({ visitorName: null })
        .where(
          inArray(
            comments.id,
            db
              .select({ id: comments.id })
              .from(comments)
              .where(
                and(
                  isNotNull(comments.visitorName),
                  lt(comments.createdAt, old)
                )
              )
              .limit(limit)
          )
        )
        .returning({ id: comments.id });

      const decisionNames = yield* db
        .update(approvalRequests)
        .set({ decidedByName: null })
        .where(
          inArray(
            approvalRequests.id,
            db
              .select({ id: approvalRequests.id })
              .from(approvalRequests)
              .where(
                and(
                  isNotNull(approvalRequests.decidedByName),
                  lt(approvalRequests.decidedAt, old)
                )
              )
              .limit(limit)
          )
        )
        .returning({ id: approvalRequests.id });

      // A link is kept while what was written through it may still name it,
      // then goes.
      yield* db.delete(links).where(
        inArray(
          links.id,
          db
            .select({ id: links.id })
            .from(links)
            .where(
              or(
                lt(links.expiresAt, old),
                and(isNotNull(links.revokedAt), lt(links.revokedAt, old))
              )
            )
            .limit(limit)
        )
      );

      return {
        names: commentNames.length + decisionNames.length,
      };
    }, Effect.mapError(failed));

    return ReviewArchive.of({ deletePost, deleteWorkspace, forgetUser, purge });
  })
);
