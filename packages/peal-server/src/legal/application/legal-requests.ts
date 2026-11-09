import { Context, DateTime, Effect, Layer } from "effect";

import { LegalRecordIdSchema } from "#legal/domain/legal-record-id.ts";
import type { LegalRecordId } from "#legal/domain/legal-record-id.ts";
import type { LegalSubject } from "#legal/domain/legal-subject.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { LegalStore } from "./ports/legal-store.ts";
import type { ConnectionEntry, HeldAccount } from "./ports/legal-store.ts";

/** A legal request, as staff enter it. */
export interface LegalRequest {
  /** The authority that asked: a court, a public prosecutor, a police service. */
  readonly authority: string;
  /** Its reference: the requisition's number, the procedure, its date. */
  readonly reference: string;
  readonly staffId: UserId;
  readonly subject: LegalSubject;
}

/** What a legal request got, as it was recorded. */
export interface LegalAnswer {
  readonly at: DateTime.Utc;
  readonly connections: readonly ConnectionEntry[];
  readonly held: readonly HeldAccount[];
  /** The record of the answer. */
  readonly id: LegalRecordId;
}

/**
 * Answers a legal request (loi n° 2004-575, art. 6, V, B: a judicial
 * authority asking for the data that identifies who contributed content):
 * the closed accounts the subject names, and the connections that made
 * content of those accounts, of the account named, or in the workspace
 * named. The answer, with the staff member, the authority, its reference
 * and what was asked, is recorded in the same transaction as it is read, so
 * no one reads these records unrecorded. The only reader of what closed
 * accounts left.
 */
export class LegalRequests extends Context.Service<
  LegalRequests,
  {
    readonly answer: (
      request: LegalRequest
    ) => Effect.Effect<LegalAnswer, DatabaseError>;
  }
>()("peal-server/legal/application/LegalRequests") {
  static readonly layer = Layer.effect(
    LegalRequests,
    Effect.gen(function* LegalRequestsLive() {
      const ports = yield* Effect.context<Ids | TransactionRunner>();
      const store = yield* LegalStore;
      const { transaction } = yield* TransactionRunner;

      const answer = Effect.fn("LegalRequests.answer")(function* answer(
        request: LegalRequest
      ) {
        const id = yield* newId(LegalRecordIdSchema);
        const at = yield* DateTime.now;

        return yield* transaction(
          Effect.gen(function* answerInTransaction() {
            const held = yield* store.held(request.subject);

            const userIds = [
              ...held.map(({ userId }) => userId),
              ...("userId" in request.subject ? [request.subject.userId] : []),
            ];

            const connections = yield* store.connections({
              userIds: [...new Set(userIds)],
              workspaceIds:
                "workspaceId" in request.subject
                  ? [request.subject.workspaceId]
                  : [],
            });

            yield* store.disclose({
              at,
              authority: request.authority,
              connections: connections.length,
              held: held.length,
              id,
              reference: request.reference,
              staffId: request.staffId,
              subject: request.subject,
            });

            return { at, connections, held, id };
          })
        );
      }, Effect.provideContext(ports));

      return LegalRequests.of({ answer });
    })
  );
}
