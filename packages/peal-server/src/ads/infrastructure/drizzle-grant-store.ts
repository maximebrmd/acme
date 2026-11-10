import { and, asc, eq, lt, notExists, sql } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { GrantStore } from "#ads/application/ports/grant-store.ts";
import type { SignInAttempt } from "#ads/application/ports/grant-store.ts";
import { AdGrant } from "#ads/domain/ad-grant.ts";
import { AdNetworkSchema } from "#ads/domain/ad-network.ts";
import { AdGrantIdSchema } from "#ads/domain/ids.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, dateOrNull, failed, utc, utcOrNone } from "./rows.ts";
import { accounts, grants, signInAttempts } from "./schema.ts";

type Row = typeof grants.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written fails loudly instead of being trusted.
const decodeGrant = Schema.decodeUnknownEffect(AdGrant);

const toGrant = (row: Row) =>
  decodeGrant({
    access: row.access,
    createdAt: utc(row.createdAt),
    expiresAt: utcOrNone(row.expiresAt),
    grantedBy: Option.fromNullOr(row.grantedBy),
    id: row.id,
    network: row.network,
    platformUserId: row.platformUserId,
    scopes: row.scopes,
    updatedAt: utc(row.updatedAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const some = (rows: readonly Row[]) =>
  Option.match(Option.fromUndefinedOr(rows[0]), {
    onNone: () => Effect.succeed(Option.none<AdGrant>()),
    onSome: (row) => toGrant(row).pipe(Effect.map(Option.some)),
  });

// The id of the key a sealed token names: what comes before its first dot.
const keyIdOf = (sealed: string) => sealed.split(".", 1)[0] ?? sealed;

/** Grants, their sealed tokens and sign-ins in progress, in the ads schema. */
export const DrizzleGrantStore = Layer.effect(
  GrantStore,
  Effect.gen(function* DrizzleGrantStore() {
    const db = yield* Drizzle;

    return GrantStore.of({
      findIn: (workspaceId, grantId) =>
        db
          .select()
          .from(grants)
          .where(
            and(eq(grants.workspaceId, workspaceId), eq(grants.id, grantId))
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      list: (workspaceId) =>
        db
          .select()
          .from(grants)
          .where(eq(grants.workspaceId, workspaceId))
          .orderBy(asc(grants.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toGrant))
          ),
      markRejected: (grantId, now) =>
        db
          .update(grants)
          .set({ access: "reconnectNeeded", updatedAt: date(now) })
          .where(and(eq(grants.id, grantId), eq(grants.access, "working")))
          .returning({ id: grants.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      purge: Effect.fn("GrantStore.purge")(function* purge(now, unusedSince) {
        const attempts = yield* db
          .delete(signInAttempts)
          .where(lt(signInAttempts.expiresAt, date(now)))
          .returning({ stateHash: signInAttempts.stateHash })
          .pipe(Effect.mapError(failed));

        const unused = yield* db
          .delete(grants)
          .where(
            and(
              lt(grants.updatedAt, date(unusedSince)),
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(accounts)
                  .where(eq(accounts.grantId, grants.id))
              )
            )
          )
          .returning({ id: grants.id })
          .pipe(Effect.mapError(failed));

        return attempts.length + unused.length;
      }),
      remove: (workspaceId, grantId) =>
        db
          .delete(grants)
          .where(
            and(eq(grants.workspaceId, workspaceId), eq(grants.id, grantId))
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      saveAttempt: (attempt) =>
        db
          .insert(signInAttempts)
          .values({
            expiresAt: date(attempt.expiresAt),
            network: attempt.network,
            startedBy: attempt.startedBy,
            stateHash: attempt.stateHash,
            workspaceId: attempt.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      takeAttempt: (stateHash, owner) =>
        db
          .delete(signInAttempts)
          .where(
            and(
              eq(signInAttempts.stateHash, stateHash),
              eq(signInAttempts.workspaceId, owner.workspaceId),
              eq(signInAttempts.startedBy, owner.startedBy)
            )
          )
          .returning()
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) =>
              Option.fromUndefinedOr(row).pipe(
                Option.map((taken): SignInAttempt => ({
                  expiresAt: utc(taken.expiresAt),
                  network: Schema.decodeUnknownSync(AdNetworkSchema)(
                    taken.network
                  ),
                  startedBy: UserIdSchema.make(taken.startedBy),
                  stateHash: taken.stateHash,
                  workspaceId: WorkspaceIdSchema.make(taken.workspaceId),
                }))
              )
            )
          ),
      token: (grantId) =>
        db
          .select()
          .from(grants)
          .where(eq(grants.id, grantId))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeed(Option.none())
                : toGrant(row).pipe(
                    Effect.map((grant) =>
                      Option.some({ grant, token: row.token })
                    )
                  )
            )
          ),
      upsert: Effect.fn("GrantStore.upsert")(function* upsert(grant, token) {
        // The person's earlier grant keeps its id, which its accounts and
        // its token are bound to.
        const [earlier] = yield* db
          .select({ id: grants.id })
          .from(grants)
          .where(
            and(
              eq(grants.workspaceId, grant.workspaceId),
              eq(grants.network, grant.network),
              eq(grants.platformUserId, grant.platformUserId)
            )
          )
          .pipe(Effect.mapError(failed));

        const id =
          earlier === undefined ? grant.id : AdGrantIdSchema.make(earlier.id);

        const sealed = yield* token(id);

        const written = {
          access: "working",
          expiresAt: dateOrNull(grant.expiresAt),
          grantedBy: Option.getOrNull(grant.grantedBy),
          scopes: [...grant.scopes],
          token: sealed,
          tokenKeyId: keyIdOf(sealed),
          updatedAt: date(grant.updatedAt),
        };

        const rows = yield* db
          .insert(grants)
          .values({
            ...written,
            createdAt: date(grant.createdAt),
            id,
            network: grant.network,
            platformUserId: grant.platformUserId,
            workspaceId: grant.workspaceId,
          })
          .onConflictDoUpdate({
            set: written,
            target: [grants.workspaceId, grants.network, grants.platformUserId],
          })
          .returning()
          .pipe(Effect.mapError(failed));

        return yield* some(rows).pipe(Effect.map(Option.getOrThrow));
      }),
    });
  })
);
