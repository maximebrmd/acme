import { and, asc, eq, isNotNull } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { CommentStore } from "#review/application/ports/comment-store.ts";
import { ReviewComment } from "#review/domain/review-comment.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  date,
  failed,
  reviewerColumns,
  reviewerOfColumns,
  utc,
} from "./rows.ts";
import { comments } from "./schema.ts";

type CommentRow = typeof comments.$inferSelect;

const decodeComment = Schema.decodeUnknownEffect(ReviewComment);

const anchorOf = (row: CommentRow) =>
  Option.fromNullOr(row.anchorChannelId).pipe(
    Option.map((channelId) => ({
      channelId,
      selection:
        row.anchorQuote === null || row.anchorStart === null
          ? Option.none()
          : Option.some({ quote: row.anchorQuote, start: row.anchorStart }),
    }))
  );

const resolutionOf = ({
  resolvedAt,
  resolvedByKind,
  resolvedByUserId,
}: CommentRow) =>
  resolvedAt === null || resolvedByKind === null
    ? Effect.succeedNone
    : reviewerOfColumns({
        kind: resolvedByKind,
        linkId: null,
        name: null,
        userId: resolvedByUserId,
      }).pipe(Effect.map((by) => Option.some({ at: utc(resolvedAt), by })));

const toComment = (row: CommentRow) =>
  Effect.gen(function* decodeRow() {
    return yield* decodeComment({
      anchor: anchorOf(row),
      author: yield* reviewerOfColumns({
        kind: row.authorKind,
        linkId: row.authorLinkId,
        name: row.visitorName,
        userId: row.authorUserId,
      }),
      createdAt: utc(row.createdAt),
      id: row.id,
      parentId: Option.fromNullOr(row.parentId),
      postId: row.postId,
      resolution: yield* resolutionOf(row),
      text: row.body,
      workspaceId: row.workspaceId,
    });
  }).pipe(Effect.orDie);

const resolutionColumns = ({ resolution }: ReviewComment) =>
  Option.match(resolution, {
    onNone: () => ({
      resolvedAt: null,
      resolvedByKind: null,
      resolvedByUserId: null,
    }),
    onSome: ({ at, by }) => {
      const { kind, userId } = reviewerColumns(by);

      return {
        resolvedAt: date(at),
        resolvedByKind: kind,
        resolvedByUserId: userId,
      };
    },
  });

/** Comments in the review schema. */
export const DrizzleCommentStore = Layer.effect(
  CommentStore,
  Effect.gen(function* DrizzleCommentStore() {
    const db = yield* Drizzle;

    return CommentStore.of({
      get: (workspaceId, commentId) =>
        db
          .select()
          .from(comments)
          .where(
            and(
              eq(comments.workspaceId, workspaceId),
              eq(comments.id, commentId)
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeedNone
                : toComment(row).pipe(Effect.map(Option.some))
            )
          ),
      insert: (comment) => {
        const author = reviewerColumns(comment.author);

        const selection = comment.anchor.pipe(
          Option.flatMap((anchor) => anchor.selection)
        );

        return db
          .insert(comments)
          .values({
            ...resolutionColumns(comment),
            anchorChannelId: comment.anchor.pipe(
              Option.map(({ channelId }) => channelId),
              Option.getOrNull
            ),
            anchorQuote: selection.pipe(
              Option.map(({ quote }) => quote),
              Option.getOrNull
            ),
            anchorStart: selection.pipe(
              Option.map(({ start }) => start),
              Option.getOrNull
            ),
            authorKind: author.kind,
            authorLinkId: author.linkId,
            authorUserId: author.userId,
            body: comment.text,
            createdAt: date(comment.createdAt),
            id: comment.id,
            parentId: Option.getOrNull(comment.parentId),
            postId: comment.postId,
            visitorName: author.name,
            workspaceId: comment.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid);
      },
      membersOn: (workspaceId, postId) =>
        db
          .selectDistinct({ userId: comments.authorUserId })
          .from(comments)
          .where(
            and(
              eq(comments.workspaceId, workspaceId),
              eq(comments.postId, postId),
              isNotNull(comments.authorUserId)
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) =>
              rows.flatMap(({ userId }) =>
                userId === null ? [] : [UserIdSchema.make(userId)]
              )
            )
          ),
      ofPost: (workspaceId, postId) =>
        db
          .select()
          .from(comments)
          .where(
            and(
              eq(comments.workspaceId, workspaceId),
              eq(comments.postId, postId)
            )
          )
          .orderBy(asc(comments.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toComment))
          ),
      update: (comment) =>
        db
          .update(comments)
          .set(resolutionColumns(comment))
          .where(eq(comments.id, comment.id))
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
