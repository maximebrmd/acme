import { and, asc, eq, gt, inArray, lte, or, sql } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";
import { SqlClient, SqlError } from "effect/sql";

import { AccountStore } from "#ads/application/ports/account-store.ts";
import type { AuthorizedAccount } from "#ads/application/ports/account-store.ts";
import { AdAccount } from "#ads/domain/ad-account.ts";
import { SpendAuthorizationSchema } from "#ads/domain/spend-authorization.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, dateOrNull, failed, utc, utcOrNone } from "./rows.ts";
import { accounts, grants } from "./schema.ts";

type Row = typeof accounts.$inferSelect;

const decodeAccount = Schema.decodeUnknownEffect(AdAccount);

const decodeAuthorization = Schema.decodeUnknownEffect(
  SpendAuthorizationSchema
);

/** An account's row, with its grant's access, as the domain has it. */
export const toAccount = (row: Row, access: string) =>
  decodeAccount({
    access,
    amountSpent: Option.fromNullOr(row.amountSpent),
    connectedAt: utc(row.connectedAt),
    connectedBy: Option.fromNullOr(row.connectedBy),
    currency: row.currency,
    externalId: row.externalId,
    grantId: row.grantId,
    id: row.id,
    name: row.name,
    network: row.network,
    spendCap: Option.fromNullOr(row.spendCap),
    status: row.status,
    syncedAt: utcOrNone(row.syncedAt),
    timeZone: row.timeZone,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const toAuthorized = (joined: { account: Row; access: string }) =>
  Effect.gen(function* decoding() {
    const { account: row } = joined;

    const authorization = yield* decodeAuthorization(
      row.spendingEnabled && row.authorizedAt !== null
        ? {
            _tag: "on",
            at: utc(row.authorizedAt),
            by: Option.fromNullOr(row.authorizedBy),
            monthlyCeiling: row.monthlyCeiling,
          }
        : { _tag: "off" }
    ).pipe(Effect.orDie);

    const authorized: AuthorizedAccount = {
      account: yield* toAccount(row, joined.access),
      authorization,
    };

    return authorized;
  });

const some = (rows: readonly { account: Row; access: string }[]) =>
  Option.match(Option.fromUndefinedOr(rows[0]), {
    onNone: () => Effect.succeed(Option.none<AuthorizedAccount>()),
    onSome: (row) => toAuthorized(row).pipe(Effect.map(Option.some)),
  });

/** Ad accounts in the ads schema. */
export const DrizzleAccountStore = Layer.effect(
  AccountStore,
  Effect.gen(function* DrizzleAccountStore() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;

    const joined = () =>
      db
        .select({ access: grants.access, account: accounts })
        .from(accounts)
        .innerJoin(grants, eq(grants.id, accounts.grantId));

    // A transaction that holds the lock `name` and `key` name until it
    // ends.
    const locked = <A, E, R>(
      name: string,
      key: string,
      effect: Effect.Effect<A, E, R>
    ) =>
      client
        .withTransaction(
          client`SELECT pg_advisory_xact_lock(hashtext(${name}), hashtext(${key}))`.pipe(
            Effect.andThen(effect)
          )
        )
        .pipe(
          Effect.catchIf(SqlError.isSqlError, (failure) =>
            Effect.fail(failed(failure))
          )
        );

    return AccountStore.of({
      addingTo: (workspaceId, changing) =>
        locked("peal-server/ads/additions", workspaceId, changing).pipe(
          Effect.withSpan("AccountStore.addingTo")
        ),
      authorize: (accountId, authorization) =>
        db
          .update(accounts)
          .set(
            authorization._tag === "on"
              ? {
                  authorizedAt: date(authorization.at),
                  authorizedBy: Option.getOrNull(authorization.by),
                  monthlyCeiling: authorization.monthlyCeiling,
                  spendingEnabled: true,
                }
              : {
                  authorizedAt: null,
                  authorizedBy: null,
                  monthlyCeiling: null,
                  spendingEnabled: false,
                }
          )
          .where(eq(accounts.id, accountId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      count: (workspaceId) =>
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(accounts)
          .where(eq(accounts.workspaceId, workspaceId))
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.count ?? 0)
          ),
      dueForSync: (now, limit, after) =>
        joined()
          .where(
            and(
              eq(grants.access, "working"),
              lte(accounts.nextSyncAt, date(now)),
              after.pipe(
                Option.map((cursor) =>
                  or(
                    gt(accounts.nextSyncAt, date(cursor.dueAt)),
                    and(
                      eq(accounts.nextSyncAt, date(cursor.dueAt)),
                      gt(accounts.id, cursor.accountId)
                    )
                  )
                ),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(asc(accounts.nextSyncAt), asc(accounts.id))
          .limit(limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach((row) =>
                toAccount(row.account, row.access).pipe(
                  Effect.map((account) => ({
                    account,
                    dueAt: utc(row.account.nextSyncAt),
                  }))
                )
              )
            )
          ),
      findIn: (workspaceId, accountId) =>
        joined()
          .where(
            and(
              eq(accounts.workspaceId, workspaceId),
              eq(accounts.id, accountId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      get: (accountId) =>
        joined()
          .where(eq(accounts.id, accountId))
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      insert: Effect.fn("AccountStore.insert")(function* insert(account) {
        yield* db
          .insert(accounts)
          .values({
            amountSpent: Option.getOrNull(account.amountSpent),
            connectedAt: date(account.connectedAt),
            connectedBy: Option.getOrNull(account.connectedBy),
            currency: account.currency,
            externalId: account.externalId,
            grantId: account.grantId,
            id: account.id,
            name: account.name,
            network: account.network,
            // Read at the next run of the sync.
            nextSyncAt: date(account.connectedAt),
            spendCap: Option.getOrNull(account.spendCap),
            status: account.status,
            syncedAt: dateOrNull(account.syncedAt),
            timeZone: account.timeZone,
            workspaceId: account.workspaceId,
          })
          .onConflictDoNothing({
            target: [
              accounts.workspaceId,
              accounts.network,
              accounts.externalId,
            ],
          })
          .pipe(Effect.mapError(failed));

        const [stored] = yield* joined()
          .where(
            and(
              eq(accounts.workspaceId, account.workspaceId),
              eq(accounts.network, account.network),
              eq(accounts.externalId, account.externalId)
            )
          )
          .pipe(Effect.mapError(failed));

        return stored === undefined
          ? account
          : yield* toAccount(stored.account, stored.access);
      }),
      list: (workspaceId) =>
        joined()
          .where(eq(accounts.workspaceId, workspaceId))
          .orderBy(asc(accounts.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toAuthorized))
          ),
      ofGrant: (grantId) =>
        joined()
          .where(eq(accounts.grantId, grantId))
          .orderBy(asc(accounts.id))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach((row) => toAccount(row.account, row.access))
            )
          ),
      remove: (workspaceId, accountId) =>
        db
          .delete(accounts)
          .where(
            and(
              eq(accounts.workspaceId, workspaceId),
              inArray(accounts.id, [accountId])
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      saveFacts: (accountId, facts) =>
        db
          .update(accounts)
          .set({
            amountSpent: Option.getOrNull(facts.amountSpent),
            name: facts.name,
            spendCap: Option.getOrNull(facts.spendCap),
            status: facts.status,
            // The currency and the zone an account was connected with
            // stay: budgets and months were counted in them.
          })
          .where(eq(accounts.id, accountId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      scheduleSync: (accountId, next, syncedAt) =>
        db
          .update(accounts)
          .set({
            nextSyncAt: date(next),
            ...Option.match(syncedAt, {
              onNone: () => ({}),
              onSome: (at) => ({ syncedAt: date(at) }),
            }),
          })
          .where(eq(accounts.id, accountId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      spendingOn: (accountId, spending) =>
        locked("peal-server/ads/spending", accountId, spending).pipe(
          Effect.withSpan("AccountStore.spendingOn")
        ),
    });
  })
);
