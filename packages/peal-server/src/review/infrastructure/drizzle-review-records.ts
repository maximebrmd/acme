import { asc, eq, or } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { ReviewArchive } from "#review/application/ports/review-archive.ts";
import { ReviewRecords } from "#review/application/review-records.ts";
import { defaultApprovalPolicy } from "#review/domain/approval-policy.ts";
import type {
  ApprovalRecord,
  ReviewCommentRecord,
  ReviewLinkRecord,
} from "#shared/application/personal-data.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { failed, utc } from "./rows.ts";
import { approvalRequests, comments, links, settings } from "./schema.ts";

const utcOrNull = (value: Date | null) => (value === null ? null : utc(value));

const commentRecord = (
  row: typeof comments.$inferSelect
): ReviewCommentRecord => ({
  author: row.authorKind,
  authorName: row.visitorName,
  authorUserId: row.authorUserId,
  channelId: row.anchorChannelId,
  createdAt: utc(row.createdAt),
  id: row.id,
  parentId: row.parentId,
  postId: row.postId,
  quote: row.anchorQuote,
  resolvedAt: utcOrNull(row.resolvedAt),
  text: row.body,
});

const approvalRecord = (
  row: typeof approvalRequests.$inferSelect
): ApprovalRecord => ({
  decidedAt: utcOrNull(row.decidedAt),
  decidedBy: row.decidedByKind,
  decidedByName: row.decidedByName,
  decidedByUserId: row.decidedByUserId,
  id: row.id,
  postId: row.postId,
  requestedAt: utc(row.requestedAt),
  requestedBy: row.requestedBy,
  scheduledAt: utc(row.scheduledAt),
  status: row.status,
});

const linkRecord = (row: typeof links.$inferSelect): ReviewLinkRecord => ({
  access: row.access,
  createdAt: utc(row.createdAt),
  createdBy: row.createdBy,
  expiresAt: utc(row.expiresAt),
  id: row.id,
  postId: row.postId,
  revokedAt: utcOrNull(row.revokedAt),
});

/**
 * ReviewRecords on the review schema. Exports hold what was said and
 * decided, never a link's token hash nor a visitor's address.
 */
export const DrizzleReviewRecords = Layer.effect(
  ReviewRecords,
  Effect.gen(function* DrizzleReviewRecords() {
    const archive = yield* ReviewArchive;
    const db = yield* Drizzle;

    const exportWorkspace = Effect.fn("ReviewRecords.exportWorkspace")(
      function* exportWorkspace(workspaceId: string) {
        const [chosen] = yield* db
          .select({ policy: settings.approvalPolicy })
          .from(settings)
          .where(eq(settings.workspaceId, workspaceId));

        const written = yield* db
          .select()
          .from(comments)
          .where(eq(comments.workspaceId, workspaceId))
          .orderBy(asc(comments.id));

        const asked = yield* db
          .select()
          .from(approvalRequests)
          .where(eq(approvalRequests.workspaceId, workspaceId))
          .orderBy(asc(approvalRequests.id));

        const made = yield* db
          .select()
          .from(links)
          .where(eq(links.workspaceId, workspaceId))
          .orderBy(asc(links.id));

        return {
          approvalPolicy: chosen?.policy ?? defaultApprovalPolicy,
          approvals: asked.map(approvalRecord),
          comments: written.map(commentRecord),
          links: made.map(linkRecord),
        };
      },
      Effect.mapError(failed)
    );

    const exportUser = Effect.fn("ReviewRecords.exportUser")(
      function* exportUser(userId: string) {
        const written = yield* db
          .select()
          .from(comments)
          .where(eq(comments.authorUserId, userId))
          .orderBy(asc(comments.id));

        const asked = yield* db
          .select()
          .from(approvalRequests)
          .where(
            or(
              eq(approvalRequests.requestedBy, userId),
              eq(approvalRequests.decidedByUserId, userId)
            )
          )
          .orderBy(asc(approvalRequests.id));

        return {
          approvals: asked.map((row) => ({
            ...approvalRecord(row),
            workspaceId: row.workspaceId,
          })),
          comments: written.map((row) => ({
            ...commentRecord(row),
            workspaceId: row.workspaceId,
          })),
        };
      },
      Effect.mapError(failed)
    );

    return ReviewRecords.of({
      eraseWorkspace: archive.deleteWorkspace,
      exportUser,
      exportWorkspace,
      forgetUser: archive.forgetUser,
    });
  })
);
