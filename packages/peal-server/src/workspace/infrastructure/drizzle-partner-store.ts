import { and, asc, between, count, eq, gte, lt } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { DatabaseError } from "#shared/application/database-error.ts";
import { PermissionSchema } from "#shared/domain/access.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { PartnerStore } from "#workspace/application/partner-store.ts";
import {
  PartnerKey,
  PartnerScopeSchema,
} from "#workspace/domain/partner-key.ts";
import { Partner } from "#workspace/domain/partner.ts";

import { organization } from "./auth-schema.generated.ts";
import {
  partnerKeys,
  partners,
  partnerUsageDays,
  partnerWorkspaces,
} from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (stored: Date) => DateTime.fromDateUnsafe(stored);

const decodePartner = Schema.decodeUnknownEffect(Partner);

const decodeKey = Schema.decodeUnknownEffect(PartnerKey);

// Rows are decoded with the domain's schema: one that no longer decodes is
// a bug, or a row written by hand.
const toPartner = (row: typeof partners.$inferSelect) =>
  decodePartner({
    accentColor: Option.fromNullOr(row.accentColor),
    createdAt: utc(row.createdAt),
    id: row.id,
    logoUrl: Option.fromNullOr(row.logoUrl),
    name: row.name,
    returnOrigins: row.returnOrigins,
    updatedAt: utc(row.updatedAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

// A scope or a permission the vocabulary no longer knows is dropped rather
// than trusted.
const known = <A extends string>(
  literals: readonly A[],
  stored: readonly string[]
): readonly A[] => literals.filter((literal) => stored.includes(literal));

const toKey = (row: typeof partnerKeys.$inferSelect) =>
  decodeKey({
    createdAt: utc(row.createdAt),
    expiresAt: Option.fromNullOr(row.expiresAt).pipe(Option.map(utc)),
    id: row.id,
    name: row.name,
    partnerId: row.partnerId,
    permissions: known(PermissionSchema.literals, row.permissions),
    scopes: known(PartnerScopeSchema.literals, row.scopes),
    start: row.start,
  }).pipe(Effect.orDie);

const first = (rows: readonly (typeof partners.$inferSelect)[]) =>
  Option.match(Option.fromUndefinedOr(rows[0]), {
    onNone: () => Effect.succeedNone,
    onSome: (row) => toPartner(row).pipe(Effect.map(Option.some)),
  });

/** PartnerStore in the workspace schema. */
export const DrizzlePartnerStore = Layer.effect(
  PartnerStore,
  Effect.gen(function* DrizzlePartnerStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    return PartnerStore.of({
      addKey: (key, digest, createdBy) =>
        db
          .insert(partnerKeys)
          .values({
            createdAt: date(key.createdAt),
            createdBy,
            expiresAt: Option.getOrNull(key.expiresAt.pipe(Option.map(date))),
            id: key.id,
            keyDigest: digest,
            name: key.name,
            partnerId: key.partnerId,
            permissions: [...key.permissions],
            scopes: [...key.scopes],
            start: key.start,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      all: db
        .select()
        .from(partners)
        .orderBy(asc(partners.id))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(Effect.forEach(toPartner))
        ),
      closeOf: (workspaceId) =>
        client
          .withTransaction(
            Effect.gen(function* closeOf() {
              const [account] = yield* db
                .select({ id: partners.id })
                .from(partners)
                .where(eq(partners.workspaceId, workspaceId))
                .limit(1)
                .pipe(Effect.mapError(failed));

              if (account === undefined) {
                return 0;
              }

              // The partner's hold, as CustomerWorkspaces takes it.
              yield* client`SELECT pg_advisory_xact_lock(hashtext('peal-server/workspace/partner'), hashtext(${account.id}))`.pipe(
                Effect.mapError(failed)
              );

              const [owned] = yield* db
                .select({ total: count() })
                .from(partnerWorkspaces)
                .where(eq(partnerWorkspaces.partnerId, account.id))
                .pipe(Effect.mapError(failed));

              if (owned !== undefined && owned.total > 0) {
                return owned.total;
              }

              yield* db
                .delete(partners)
                .where(eq(partners.id, account.id))
                .pipe(Effect.mapError(failed));

              return 0;
            })
          )
          .pipe(
            Effect.catchTag("SqlError", (failure) =>
              Effect.fail(failed(failure))
            )
          ),
      get: (partnerId) =>
        db
          .select()
          .from(partners)
          .where(eq(partners.id, partnerId))
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(first)),
      keyByDigest: (digest) =>
        db
          .select()
          .from(partnerKeys)
          .where(eq(partnerKeys.keyDigest, digest))
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeedNone
                : toKey(row).pipe(Effect.map(Option.some))
            )
          ),
      keys: (partnerId) =>
        db
          .select()
          .from(partnerKeys)
          .where(eq(partnerKeys.partnerId, partnerId))
          .orderBy(asc(partnerKeys.id))
          .pipe(Effect.mapError(failed), Effect.flatMap(Effect.forEach(toKey))),
      ofWorkspace: (workspaceId) =>
        db
          .select()
          .from(partners)
          .where(eq(partners.workspaceId, workspaceId))
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(first)),
      ofWorkspaces: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map())
          : db
              .select()
              .from(partners)
              .where(anyUuid(partners.workspaceId, workspaceIds))
              .pipe(
                Effect.mapError(failed),
                Effect.flatMap(Effect.forEach(toPartner)),
                Effect.map(
                  (found) =>
                    new Map(
                      found.map((partner) => [partner.workspaceId, partner])
                    )
                )
              ),
      // In one transaction, under the workspace's row lock: the account is
      // written only for a workspace that exists, has none, and is not one
      // a partner owns.
      open: (partner) =>
        client
          .withTransaction(
            Effect.gen(function* open() {
              const [workspace] = yield* db
                .select({ id: organization.id })
                .from(organization)
                .where(eq(organization.id, partner.workspaceId))
                .limit(1)
                .for("update");

              const [owned] = yield* db
                .select({ workspaceId: partnerWorkspaces.workspaceId })
                .from(partnerWorkspaces)
                .where(eq(partnerWorkspaces.workspaceId, partner.workspaceId))
                .limit(1);

              if (workspace === undefined || owned !== undefined) {
                return false;
              }

              const written = yield* db
                .insert(partners)
                .values({
                  accentColor: Option.getOrNull(partner.accentColor),
                  createdAt: date(partner.createdAt),
                  id: partner.id,
                  logoUrl: Option.getOrNull(partner.logoUrl),
                  name: partner.name,
                  returnOrigins: [...partner.returnOrigins],
                  updatedAt: date(partner.updatedAt),
                  workspaceId: partner.workspaceId,
                })
                .onConflictDoNothing({ target: partners.workspaceId })
                .returning({ id: partners.id });

              return written.length > 0;
            })
          )
          .pipe(Effect.mapError(failed)),
      // One statement on the `day` index, counted in the database.
      purgeUsageBefore: (day) =>
        db
          .delete(partnerUsageDays)
          .where(lt(partnerUsageDays.day, DateTime.formatIsoDateUtc(day)))
          .returning({ day: partnerUsageDays.day })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
      recordUsage: (partnerId, usage) =>
        db
          .insert(partnerUsageDays)
          .values({
            channels: usage.channels,
            day: usage.day,
            partnerId,
            workspaces: usage.workspaces,
          })
          .onConflictDoUpdate({
            set: { channels: usage.channels, workspaces: usage.workspaces },
            target: [partnerUsageDays.partnerId, partnerUsageDays.day],
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      removeKey: (partnerId, keyId) =>
        db
          .delete(partnerKeys)
          .where(
            and(eq(partnerKeys.partnerId, partnerId), eq(partnerKeys.id, keyId))
          )
          .returning({ id: partnerKeys.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      save: (partner) =>
        db
          .update(partners)
          .set({
            accentColor: Option.getOrNull(partner.accentColor),
            logoUrl: Option.getOrNull(partner.logoUrl),
            name: partner.name,
            returnOrigins: [...partner.returnOrigins],
            updatedAt: date(partner.updatedAt),
          })
          .where(eq(partners.id, partner.id))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      usage: (partnerId, since) =>
        db
          .select({
            channels: partnerUsageDays.channels,
            day: partnerUsageDays.day,
            workspaces: partnerUsageDays.workspaces,
          })
          .from(partnerUsageDays)
          .where(
            and(
              eq(partnerUsageDays.partnerId, partnerId),
              gte(partnerUsageDays.day, DateTime.formatIsoDateUtc(since))
            )
          )
          .orderBy(asc(partnerUsageDays.day))
          .pipe(Effect.mapError(failed)),
      usageBetween: (partnerId, from, to) =>
        db
          .select({
            channels: partnerUsageDays.channels,
            day: partnerUsageDays.day,
            workspaces: partnerUsageDays.workspaces,
          })
          .from(partnerUsageDays)
          .where(
            and(
              eq(partnerUsageDays.partnerId, partnerId),
              between(
                partnerUsageDays.day,
                DateTime.formatIsoDateUtc(from),
                DateTime.formatIsoDateUtc(to)
              )
            )
          )
          .orderBy(asc(partnerUsageDays.day))
          .pipe(Effect.mapError(failed)),
    });
  })
);
