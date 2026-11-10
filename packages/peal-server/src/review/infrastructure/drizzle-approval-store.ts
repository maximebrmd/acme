import { and, asc, desc, eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { ApprovalStore } from "#review/application/ports/approval-store.ts";
import { ApprovalRequest } from "#review/domain/approval-request.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  date,
  failed,
  reviewerColumns,
  reviewerOfColumns,
  utc,
} from "./rows.ts";
import { approvalRequests } from "./schema.ts";

type RequestRow = typeof approvalRequests.$inferSelect;

const decodeRequest = Schema.decodeUnknownEffect(ApprovalRequest);

const decisionOf = ({
  decidedAt,
  decidedByKind,
  decidedByLinkId,
  decidedByName,
  decidedByUserId,
}: RequestRow) =>
  decidedAt === null || decidedByKind === null
    ? Effect.succeedNone
    : reviewerOfColumns({
        kind: decidedByKind,
        linkId: decidedByLinkId,
        name: decidedByName,
        userId: decidedByUserId,
      }).pipe(Effect.map((by) => Option.some({ at: utc(decidedAt), by })));

const toRequest = (row: RequestRow) =>
  Effect.gen(function* decodeRow() {
    return yield* decodeRequest({
      decision: yield* decisionOf(row),
      id: row.id,
      postId: row.postId,
      requestedAt: utc(row.requestedAt),
      requestedBy: Option.fromNullOr(row.requestedBy),
      requestedVia: row.requestedVia,
      scheduledAt: utc(row.scheduledAt),
      status: row.status,
      subjectHash: row.subjectHash,
      timeZone: row.scheduleZone,
      workspaceId: row.workspaceId,
    });
  }).pipe(Effect.orDie);

// Every column a request's life changes.
const columnsOf = (request: ApprovalRequest) => {
  const decided = request.decision.pipe(
    Option.map(({ at, by }) => ({ at, by: reviewerColumns(by) }))
  );

  return {
    decidedAt: decided.pipe(
      Option.map(({ at }) => date(at)),
      Option.getOrNull
    ),
    decidedByKind: decided.pipe(
      Option.map(({ by }) => by.kind),
      Option.getOrNull
    ),
    decidedByLinkId: decided.pipe(
      Option.flatMapNullishOr(({ by }) => by.linkId),
      Option.getOrNull
    ),
    decidedByName: decided.pipe(
      Option.flatMapNullishOr(({ by }) => by.name),
      Option.getOrNull
    ),
    decidedByUserId: decided.pipe(
      Option.flatMapNullishOr(({ by }) => by.userId),
      Option.getOrNull
    ),
    requestedBy: Option.getOrNull(request.requestedBy),
    requestedVia: request.requestedVia,
    scheduleZone: request.timeZone,
    scheduledAt: date(request.scheduledAt),
    status: request.status,
    subjectHash: request.subjectHash,
  };
};

/** Approval requests in the review schema. */
export const DrizzleApprovalStore = Layer.effect(
  ApprovalStore,
  Effect.gen(function* DrizzleApprovalStore() {
    const db = yield* Drizzle;

    return ApprovalStore.of({
      approved: (workspaceId, postId, subjectHash) =>
        db
          .select({ id: approvalRequests.id })
          .from(approvalRequests)
          .where(
            and(
              eq(approvalRequests.workspaceId, workspaceId),
              eq(approvalRequests.postId, postId),
              eq(approvalRequests.status, "approved"),
              eq(approvalRequests.subjectHash, subjectHash)
            )
          )
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      insert: (request) =>
        db
          .insert(approvalRequests)
          .values({
            ...columnsOf(request),
            id: request.id,
            postId: request.postId,
            requestedAt: date(request.requestedAt),
            workspaceId: request.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      lockPending: (workspaceId, postId) =>
        db
          .select()
          .from(approvalRequests)
          .where(
            and(
              eq(approvalRequests.workspaceId, workspaceId),
              eq(approvalRequests.postId, postId),
              eq(approvalRequests.status, "pending")
            )
          )
          .for("update")
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeedNone
                : toRequest(row).pipe(Effect.map(Option.some))
            )
          ),
      ofPost: (workspaceId, postId) =>
        db
          .select()
          .from(approvalRequests)
          .where(
            and(
              eq(approvalRequests.workspaceId, workspaceId),
              eq(approvalRequests.postId, postId)
            )
          )
          .orderBy(desc(approvalRequests.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toRequest))
          ),
      pending: (workspaceId, limit) =>
        db
          .select()
          .from(approvalRequests)
          .where(
            and(
              eq(approvalRequests.workspaceId, workspaceId),
              eq(approvalRequests.status, "pending")
            )
          )
          .orderBy(asc(approvalRequests.id))
          .limit(limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toRequest))
          ),
      update: (request) =>
        db
          .update(approvalRequests)
          .set(columnsOf(request))
          .where(eq(approvalRequests.id, request.id))
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
