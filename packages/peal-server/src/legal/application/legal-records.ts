import { Context, DateTime, Effect, Layer } from "effect";

import { LegalRecordIdSchema } from "#legal/domain/legal-record-id.ts";
import { legalRetention } from "#legal/domain/legal-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type {
  IdentificationRecord,
  LegalHoldRecord,
  LegalRemainsRecord,
} from "#shared/application/personal-data.ts";

import { LegalStore } from "./ports/legal-store.ts";

/** A connection that created, changed or deleted content, as it came. */
export interface ContentConnection {
  readonly access: string;
  readonly apiKeyId: string | null;
  readonly ipAddress: string | null;
  readonly protocol: string;
  /** The account, or the staff member acting as it; null for an API key. */
  readonly userId: string | null;
  readonly workspaceId: string | null;
}

// What closing an account leaves on a server that keeps these records.
const keptAfterClosure: LegalHoldRecord["keptAfterClosure"] = [
  {
    data: ["name", "email", "accountCreatedAt"],
    years: legalRetention.identity.years,
  },
  {
    data: ["signInIdentifiers", "stripeCustomerIds"],
    years: legalRetention.account.years,
  },
];

// The user's connections that made content, oldest first, as their export
// shows them: without who made each, which is them.
const connectionsOf = (store: LegalStore["Service"], userId: string) =>
  store.connections({ userIds: [userId], workspaceIds: [] }).pipe(
    Effect.map((entries) =>
      entries.map(({ access, at, ipAddress, protocol, workspaceId }) => ({
        access,
        at,
        ipAddress,
        protocol,
        workspaceId,
      }))
    )
  );

const legalHoldOf = (
  connections: LegalHoldRecord["connections"],
  afterClosure: LegalHoldRecord["keptAfterClosure"]
): LegalHoldRecord => ({
  basis:
    "Loi n° 2004-575 du 21 juin 2004 (LCEN), article 6, V, A, and décret n° 2021-1362 du 20 octobre 2021; GDPR Article 6(1)(c)",
  connectionYears: legalRetention.connections.years,
  connections,
  disclosedTo:
    "Only judicial authorities, and the authorities French law empowers, on a written request, each answer recorded",
  keptAfterClosure: afterClosure,
});

/**
 * What the law has Peal keep so that whoever contributed content can be
 * identified (loi n° 2004-575, art. 6, V, A; décret n° 2021-1362), for the
 * workspace context, which sees each request and closes accounts: who held
 * an account it closes, and each connection that made content. The user
 * reads their connections in their export; nothing else reads them but a
 * legal request.
 */
export class LegalRecords extends Context.Service<
  LegalRecords,
  {
    /**
     * Keeps who held the account closing now, in the caller's
     * transaction, for 5 years, and how they signed in and paid for 1.
     */
    readonly hold: (
      account: IdentificationRecord,
      /** When it closed, if not now: an erasure applied again after a restore. */
      closedAt?: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** Records a connection that made content, now, for 1 year. */
    readonly connected: (
      connection: ContentConnection
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * What the user's export tells of it: their connections that made
     * content, oldest first, and what closing the account would leave;
     * null on a server that keeps nothing for the law, and holds nothing
     * of them from a time it did.
     */
    readonly exportUser: (
      userId: string
    ) => Effect.Effect<LegalHoldRecord | null, DatabaseError>;
    /**
     * What closing the user's account now would leave, and for how long;
     * null when nothing.
     */
    readonly afterClosure: (
      userId: string
    ) => Effect.Effect<LegalRemainsRecord | null, DatabaseError>;
  }
>()("peal-server/legal/application/LegalRecords") {
  static readonly layer = Layer.effect(
    LegalRecords,
    Effect.gen(function* LegalRecordsLive() {
      const ports = yield* Effect.context<Ids>();
      const store = yield* LegalStore;

      const hold = Effect.fn("LegalRecords.hold")(function* hold(
        account: IdentificationRecord,
        closedAt?: DateTime.Utc
      ) {
        yield* store.hold({
          ...account,
          closedAt: closedAt ?? (yield* DateTime.now),
          id: yield* newId(LegalRecordIdSchema),
        });
      }, Effect.provideContext(ports));

      const connected = Effect.fn("LegalRecords.connected")(function* connected(
        connection: ContentConnection
      ) {
        yield* store.connect({
          ...connection,
          at: yield* DateTime.now,
          id: yield* newId(LegalRecordIdSchema),
        });
      }, Effect.provideContext(ports));

      const exportUser = (userId: string) =>
        connectionsOf(store, userId).pipe(
          Effect.map((connections) =>
            legalHoldOf(connections, keptAfterClosure)
          )
        );

      return LegalRecords.of({
        afterClosure: () =>
          Effect.succeed({
            accountYears: legalRetention.account.years,
            connectionYears: legalRetention.connections.years,
            identityYears: legalRetention.identity.years,
          }),
        connected,
        exportUser,
        hold,
      });
    })
  );

  /**
   * For a server whose operator is under no such obligation: nothing more
   * is kept. What it kept while it was on stays until its term, which the
   * daily purge ends, so the user's export still lists the connections it
   * holds; null once it holds none. Needs LegalStore.
   */
  static readonly layerOff = Layer.effect(
    LegalRecords,
    Effect.gen(function* LegalRecordsOff() {
      const store = yield* LegalStore;

      return LegalRecords.of({
        afterClosure: (userId) =>
          connectionsOf(store, userId).pipe(
            Effect.map((connections) =>
              connections.length === 0
                ? null
                : {
                    accountYears: null,
                    connectionYears: legalRetention.connections.years,
                    identityYears: null,
                  }
            )
          ),
        connected: () => Effect.void,
        exportUser: (userId) =>
          connectionsOf(store, userId).pipe(
            Effect.map((connections) =>
              connections.length === 0 ? null : legalHoldOf(connections, [])
            )
          ),
        hold: () => Effect.void,
      });
    })
  );
}
