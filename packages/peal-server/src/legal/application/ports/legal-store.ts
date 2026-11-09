import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { LegalRecordId } from "#legal/domain/legal-record-id.ts";
import type { LegalCutoffs } from "#legal/domain/legal-retention.ts";
import type { LegalSubject } from "#legal/domain/legal-subject.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type {
  ContentConnectionRecord,
  IdentificationRecord,
} from "#shared/application/personal-data.ts";

/**
 * A closed account's record, as kept: once its year is over, its sign-in
 * methods and Stripe customers are gone, and only who held
 * it is left.
 */
export interface HeldAccount extends IdentificationRecord {
  readonly closedAt: DateTime.Utc;
  readonly id: LegalRecordId;
}

/** A connection that created, changed or deleted content, and who made it. */
export interface ConnectionEntry extends ContentConnectionRecord {
  /** The API key it authenticated with, for `apiKey`. */
  readonly apiKeyId: string | null;
  readonly id: LegalRecordId;
  /**
   * The person behind it: the account, or the staff member acting as it;
   * null for an API key, which belongs to its workspace.
   */
  readonly userId: string | null;
}

/** What staff handed over on a legal request, and on what grounds. */
export interface Disclosure {
  readonly at: DateTime.Utc;
  /** The authority that asked, as staff wrote it. */
  readonly authority: string;
  readonly connections: number;
  readonly held: number;
  readonly id: LegalRecordId;
  /** Its reference: the requisition's number, the procedure, the date. */
  readonly reference: string;
  readonly staffId: string;
  readonly subject: LegalSubject;
}

/**
 * The records Peal keeps because the law says so, in their own Postgres
 * schema, which nothing else reads: closed accounts' identities, the
 * connections that made content, and what was handed over on legal
 * requests. Writes run in the caller's transaction, if any.
 */
export class LegalStore extends Context.Service<
  LegalStore,
  {
    readonly hold: (account: HeldAccount) => Effect.Effect<void, DatabaseError>;
    /** The closed accounts the subject names, oldest closure first. */
    readonly held: (
      subject: LegalSubject
    ) => Effect.Effect<readonly HeldAccount[], DatabaseError>;
    readonly connect: (
      connection: ConnectionEntry
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * The connections of these accounts, or in these workspaces, oldest
     * first.
     */
    readonly connections: (named: {
      readonly userIds: readonly string[];
      readonly workspaceIds: readonly string[];
    }) => Effect.Effect<readonly ConnectionEntry[], DatabaseError>;
    readonly disclose: (
      disclosure: Disclosure
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * Deletes or trims up to `limit` records of each kind past their
     * retention at `cutoffs`, and says how many it changed.
     */
    readonly purgeBatch: (
      cutoffs: LegalCutoffs,
      limit: number
    ) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/legal/application/LegalStore") {}
