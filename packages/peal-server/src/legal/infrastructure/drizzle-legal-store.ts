import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Schema } from "effect";

import type {
  ConnectionEntry,
  Disclosure,
  HeldAccount,
} from "#legal/application/ports/legal-store.ts";
import { LegalStore } from "#legal/application/ports/legal-store.ts";
import { LegalRecordIdSchema } from "#legal/domain/legal-record-id.ts";
import type { LegalCutoffs } from "#legal/domain/legal-retention.ts";
import { LegalCoverSchema } from "#legal/domain/legal-scope.ts";
import { LegalSubjectSchema } from "#legal/domain/legal-subject.ts";
import type { LegalSubject } from "#legal/domain/legal-subject.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { connections, disclosures, identificationHolds } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (value: Date) => DateTime.makeUnsafe(value);

const heldOf = (row: typeof identificationHolds.$inferSelect): HeldAccount => ({
  closedAt: utc(row.closedAt),
  email: row.email,
  id: LegalRecordIdSchema.make(row.id),
  name: row.name,
  signInMethods: row.signInMethods.map(({ accountId, provider }) => ({
    accountId,
    provider,
  })),
  stripeCustomerIds: [...row.stripeCustomerIds],
  userId: row.userId,
});

const connectionOf = (
  row: typeof connections.$inferSelect
): ConnectionEntry => ({
  access: row.access,
  apiKeyId: row.apiKeyId,
  at: utc(row.at),
  id: LegalRecordIdSchema.make(row.id),
  ipAddress: row.ipAddress,
  protocol: row.protocol,
  userId: row.userId,
  workspaceId: row.workspaceId,
});

const decodeCovers = Schema.decodeUnknownEffect(Schema.Array(LegalCoverSchema));
const decodeSubject = Schema.decodeUnknownEffect(LegalSubjectSchema);

const utcOrNull = (value: Date | null) => (value === null ? null : utc(value));

// A stored answer, its scope and subject decoded as the domain reads them.
const disclosureOf = Effect.fn("LegalStore.disclosureOf")(
  function* disclosureOf(row: typeof disclosures.$inferSelect) {
    const disclosure: Disclosure = {
      at: utc(row.at),
      authority: row.authority,
      connections: row.connections,
      covers: yield* decodeCovers(row.covers),
      held: row.held,
      id: LegalRecordIdSchema.make(row.id),
      legalBasis: row.legalBasis,
      reference: row.reference,
      since: utcOrNull(row.since),
      staffId: row.staffId,
      subject: yield* decodeSubject(row.subject),
      until: utcOrNull(row.until),
    };

    return disclosure;
  }
);

// Ids that are not UUIDs name nothing here, and Postgres would refuse them.
const uuidPattern =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

const uuids = (ids: readonly string[]) =>
  ids.filter((id) => uuidPattern.test(id));

const holdsNamed = (subject: LegalSubject) => {
  if ("email" in subject) {
    return eq(
      sql`lower(${identificationHolds.email})`,
      subject.email.trim().toLowerCase()
    );
  }

  if ("userId" in subject) {
    return inArray(identificationHolds.userId, uuids([subject.userId]));
  }

  // A workspace names no closed account.
  return null;
};

/** The legal records on the legal schema. */
export const DrizzleLegalStore = Layer.effect(
  LegalStore,
  Effect.gen(function* DrizzleLegalStore() {
    const db = yield* Drizzle;

    const purgeBatch = Effect.fn("LegalStore.purgeBatch")(function* purgeBatch(
      cutoffs: LegalCutoffs,
      limit: number
    ) {
      const deletedHolds = yield* db
        .delete(identificationHolds)
        .where(
          inArray(
            identificationHolds.id,
            db
              .select({ id: identificationHolds.id })
              .from(identificationHolds)
              .where(lt(identificationHolds.closedAt, date(cutoffs.identity)))
              .limit(limit)
          )
        )
        .returning({ id: identificationHolds.id })
        .pipe(Effect.mapError(failed));

      // Who held the account stays; how they signed in and paid goes.
      const trimmedHolds = yield* db
        .update(identificationHolds)
        .set({ signInMethods: [], stripeCustomerIds: [] })
        .where(
          inArray(
            identificationHolds.id,
            db
              .select({ id: identificationHolds.id })
              .from(identificationHolds)
              .where(
                and(
                  lt(identificationHolds.closedAt, date(cutoffs.account)),
                  or(
                    ne(identificationHolds.signInMethods, sql`'[]'::jsonb`),
                    ne(identificationHolds.stripeCustomerIds, sql`'[]'::jsonb`)
                  )
                )
              )
              .limit(limit)
          )
        )
        .returning({ id: identificationHolds.id })
        .pipe(Effect.mapError(failed));

      const deletedConnections = yield* db
        .delete(connections)
        .where(
          inArray(
            connections.id,
            db
              .select({ id: connections.id })
              .from(connections)
              .where(lt(connections.at, date(cutoffs.connections)))
              .limit(limit)
          )
        )
        .returning({ id: connections.id })
        .pipe(Effect.mapError(failed));

      const deletedDisclosures = yield* db
        .delete(disclosures)
        .where(
          inArray(
            disclosures.id,
            db
              .select({ id: disclosures.id })
              .from(disclosures)
              .where(lt(disclosures.at, date(cutoffs.disclosures)))
              .limit(limit)
          )
        )
        .returning({ id: disclosures.id })
        .pipe(Effect.mapError(failed));

      return (
        deletedHolds.length +
        trimmedHolds.length +
        deletedConnections.length +
        deletedDisclosures.length
      );
    });

    return LegalStore.of({
      connect: (connection) =>
        db
          .insert(connections)
          .values({
            access: connection.access,
            apiKeyId: connection.apiKeyId,
            at: date(connection.at),
            id: connection.id,
            ipAddress: connection.ipAddress,
            protocol: connection.protocol,
            userId: connection.userId,
            workspaceId: connection.workspaceId,
          })
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("LegalStore.connect")
          ),
      connections: ({ since, until, userIds, workspaceIds }) => {
        const users = uuids(userIds);
        const workspaces = uuids(workspaceIds);

        if (users.length === 0 && workspaces.length === 0) {
          return Effect.succeed([]);
        }

        return db
          .select()
          .from(connections)
          .where(
            and(
              or(
                inArray(connections.userId, users),
                inArray(connections.workspaceId, workspaces)
              ),
              since === undefined || since === null
                ? undefined
                : gte(connections.at, date(since)),
              until === undefined || until === null
                ? undefined
                : lte(connections.at, date(until))
            )
          )
          .orderBy(asc(connections.at), asc(connections.id))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.map(connectionOf)),
            Effect.withSpan("LegalStore.connections")
          );
      },
      disclose: (disclosure) =>
        db
          .insert(disclosures)
          .values({
            at: date(disclosure.at),
            authority: disclosure.authority,
            connections: disclosure.connections,
            covers: [...disclosure.covers],
            held: disclosure.held,
            id: disclosure.id,
            legalBasis: disclosure.legalBasis,
            reference: disclosure.reference,
            since: disclosure.since === null ? null : date(disclosure.since),
            staffId: disclosure.staffId,
            subject: { ...disclosure.subject },
            until: disclosure.until === null ? null : date(disclosure.until),
          })
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("LegalStore.disclose")
          ),
      disclosures: Effect.fn("LegalStore.disclosures")(function* list({
        limit,
        offset,
      }) {
        const rows = yield* db
          .select()
          .from(disclosures)
          .orderBy(desc(disclosures.at), desc(disclosures.id))
          .limit(limit)
          .offset(offset)
          .pipe(Effect.mapError(failed));

        const [counted] = yield* db
          .select({ total: count() })
          .from(disclosures)
          .pipe(Effect.mapError(failed));

        return {
          items: yield* Effect.all(rows.map(disclosureOf)).pipe(
            Effect.mapError(failed)
          ),
          total: counted?.total ?? 0,
        };
      }),
      held: (subject) => {
        const where = holdsNamed(subject);

        if (where === null) {
          return Effect.succeed([]);
        }

        return db
          .select()
          .from(identificationHolds)
          .where(where)
          .orderBy(
            asc(identificationHolds.closedAt),
            asc(identificationHolds.id)
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.map(heldOf)),
            Effect.withSpan("LegalStore.held")
          );
      },
      hold: (account) =>
        db
          .insert(identificationHolds)
          .values({
            closedAt: date(account.closedAt),
            email: account.email,
            id: account.id,
            name: account.name,
            signInMethods: account.signInMethods,
            stripeCustomerIds: account.stripeCustomerIds,
            userId: account.userId,
          })
          .pipe(
            Effect.mapError(failed),
            Effect.asVoid,
            Effect.withSpan("LegalStore.hold")
          ),
      purgeBatch,
    });
  })
);
