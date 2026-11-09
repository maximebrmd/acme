import { Context, DateTime, Effect, Layer } from "effect";

import { LegalRecordIdSchema } from "#legal/domain/legal-record-id.ts";
import { legalRetention } from "#legal/domain/legal-retention.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import type { Ids } from "#shared/application/ids.ts";
import type {
  IdentificationRecord,
  LegalHoldRecord,
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
      account: IdentificationRecord
    ) => Effect.Effect<void, DatabaseError>;
    /** Records a connection that made content, now, for 1 year. */
    readonly connected: (
      connection: ContentConnection
    ) => Effect.Effect<void, DatabaseError>;
    /**
     * What the user's export tells of it: their connections that made
     * content, oldest first, and what closing the account would leave;
     * null on a server that keeps nothing for the law.
     */
    readonly exportUser: (
      userId: string
    ) => Effect.Effect<LegalHoldRecord | null, DatabaseError>;
  }
>()("peal-server/legal/application/LegalRecords") {
  static readonly layer = Layer.effect(
    LegalRecords,
    Effect.gen(function* LegalRecordsLive() {
      const ports = yield* Effect.context<Ids>();
      const store = yield* LegalStore;

      const hold = Effect.fn("LegalRecords.hold")(function* hold(
        account: IdentificationRecord
      ) {
        yield* store.hold({
          ...account,
          closedAt: yield* DateTime.now,
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
        store.connections({ userIds: [userId], workspaceIds: [] }).pipe(
          Effect.map((entries): LegalHoldRecord => ({
            basis:
              "Loi n° 2004-575 du 21 juin 2004 (LCEN), article 6, V, A, and décret n° 2021-1362 du 20 octobre 2021; GDPR Article 6(1)(c)",
            connectionYears: legalRetention.connections.years,
            connections: entries.map(
              ({ access, at, ipAddress, protocol, workspaceId }) => ({
                access,
                at,
                ipAddress,
                protocol,
                workspaceId,
              })
            ),
            disclosedTo:
              "Only judicial authorities, and the authorities French law empowers, on a written request, each answer recorded",
            keptAfterClosure: [
              {
                data: ["name", "email", "accountCreatedAt"],
                years: legalRetention.identity.years,
              },
              {
                data: ["signInIdentifiers", "stripeCustomerIds"],
                years: legalRetention.account.years,
              },
            ],
          }))
        );

      return LegalRecords.of({ connected, exportUser, hold });
    })
  );

  /**
   * For a server whose operator is under no such obligation (a self-hosted
   * server outside France): nothing is kept, and the export says so.
   */
  static readonly layerOff = Layer.succeed(
    LegalRecords,
    LegalRecords.of({
      connected: () => Effect.void,
      exportUser: () => Effect.succeed(null),
      hold: () => Effect.void,
    })
  );
}
