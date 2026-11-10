import { Context, DateTime, Effect, Layer } from "effect";

import { LegalRecordIdSchema } from "#legal/domain/legal-record-id.ts";
import type { LegalRecordId } from "#legal/domain/legal-record-id.ts";
import { covering, disclosedOf } from "#legal/domain/legal-scope.ts";
import type {
  DisclosedAccount,
  LegalCover,
} from "#legal/domain/legal-scope.ts";
import type { LegalSubject } from "#legal/domain/legal-subject.ts";
import { NotLegalOfficer } from "#legal/domain/not-legal-officer.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { UserId } from "#shared/domain/ids.ts";

import { DisclosureReview } from "./ports/disclosure-review.ts";
import { LegalOfficers } from "./ports/legal-officers.ts";
import { LegalStore } from "./ports/legal-store.ts";
import type { ConnectionEntry, DisclosurePage } from "./ports/legal-store.ts";

/** A legal request, as staff enter it. */
export interface LegalRequest {
  /** The authority that asked: a court, a public prosecutor, a police service. */
  readonly authority: string;
  /** What it asks for; the answer holds nothing else. */
  readonly covers: readonly LegalCover[];
  /** The text that gives the authority the power to ask. */
  readonly legalBasis: string;
  /** Its reference: the requisition's number, the procedure, its date. */
  readonly reference: string;
  /** The period of the connections it asks for, when it names one. */
  readonly since: DateTime.Utc | null;
  readonly staffId: UserId;
  readonly subject: LegalSubject;
  readonly until: DateTime.Utc | null;
}

/** What a legal request got, as it was recorded. */
export interface LegalAnswer {
  readonly at: DateTime.Utc;
  /** Null when the request did not cover connections. */
  readonly connections: readonly ConnectionEntry[] | null;
  readonly held: readonly DisclosedAccount[];
  /** The record of the answer. */
  readonly id: LegalRecordId;
}

// Answers listed a page, as the console's other lists.
const pageSize = 25;

/**
 * Answers a legal request (loi n° 2004-575, art. 6, V, B: a judicial
 * authority asking for the data that identifies who contributed content):
 * the closed accounts the subject names, and the connections that made
 * content of those accounts, of the account named, or in the workspace
 * named, each only as far as the request covers it (`disclosedOf`). The
 * answer, with the staff member, the authority, its reference, the legal
 * basis and what was asked, is recorded in the same transaction as it is
 * read, so no one reads these records unrecorded, and shows in the staff
 * audit log, so the rest of staff see it. Only staff holding the legal role
 * answer, or read the past answers (`LegalOfficers`), not every staff
 * member who helps users. The only reader of what closed accounts left.
 */
export class LegalRequests extends Context.Service<
  LegalRequests,
  {
    readonly answer: (
      request: LegalRequest
    ) => Effect.Effect<LegalAnswer, DatabaseError | NotLegalOfficer>;
    /** The answers given so far, newest first, a page of 25 from 1. */
    readonly answered: (
      staffId: UserId,
      page: number
    ) => Effect.Effect<
      DisclosurePage & { readonly page: number; readonly pageSize: number },
      DatabaseError | NotLegalOfficer
    >;
    /** Fails unless the staff member holds the legal role. */
    readonly ensureOfficer: (
      staffId: UserId
    ) => Effect.Effect<void, DatabaseError | NotLegalOfficer>;
  }
>()("peal-server/legal/application/LegalRequests") {
  static readonly layer = Layer.effect(
    LegalRequests,
    Effect.gen(function* LegalRequestsLive() {
      const ports = yield* Effect.context<Ids | TransactionRunner>();
      const store = yield* LegalStore;
      const officers = yield* LegalOfficers;
      const review = yield* DisclosureReview;
      const { transaction } = yield* TransactionRunner;

      const ensureOfficer = Effect.fn("LegalRequests.ensureOfficer")(
        function* ensureOfficer(staffId: UserId) {
          if (!(yield* officers.mayAnswer(staffId))) {
            yield* new NotLegalOfficer();
          }
        }
      );

      const answer = Effect.fn("LegalRequests.answer")(function* answer(
        request: LegalRequest
      ) {
        yield* ensureOfficer(request.staffId);

        const id = yield* newId(LegalRecordIdSchema);
        const at = yield* DateTime.now;
        const covers = covering(request.covers);

        return yield* transaction(
          Effect.gen(function* answerInTransaction() {
            const held = yield* store.held(request.subject);

            const userIds = [
              ...held.map(({ userId }) => userId),
              ...("userId" in request.subject ? [request.subject.userId] : []),
            ];

            const connections = covers.has("connections")
              ? yield* store.connections({
                  since: request.since,
                  until: request.until,
                  userIds: [...new Set(userIds)],
                  workspaceIds:
                    "workspaceId" in request.subject
                      ? [request.subject.workspaceId]
                      : [],
                })
              : null;

            yield* store.disclose({
              at,
              authority: request.authority,
              connections: connections?.length ?? 0,
              covers: [...covers],
              held: held.length,
              id,
              legalBasis: request.legalBasis,
              reference: request.reference,
              since: request.since,
              staffId: request.staffId,
              subject: request.subject,
              until: request.until,
            });

            yield* review.answered({
              at,
              authority: request.authority,
              reference: request.reference,
              staffId: request.staffId,
              subject: request.subject,
            });

            return {
              at,
              connections,
              held: held.map((account) => disclosedOf(account, covers)),
              id,
            };
          })
        );
      }, Effect.provideContext(ports));

      const answered = Effect.fn("LegalRequests.answered")(function* answered(
        staffId: UserId,
        page: number
      ) {
        yield* ensureOfficer(staffId);

        const slice = yield* store.disclosures({
          limit: pageSize,
          offset: (Math.max(page, 1) - 1) * pageSize,
        });

        return { ...slice, page: Math.max(page, 1), pageSize };
      });

      return LegalRequests.of({ answer, answered, ensureOfficer });
    })
  );
}
