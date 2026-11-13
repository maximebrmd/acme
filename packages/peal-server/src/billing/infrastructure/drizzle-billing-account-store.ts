import { and, asc, eq, gt, lt, lte, or, sql } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { BillingAccountStore } from "#billing/application/ports/billing-account-store.ts";
import { AccountTransfer } from "#billing/domain/account-transfer.ts";
import {
  BillingAccount,
  BillingAccountIdSchema,
} from "#billing/domain/billing-account.ts";
import type { BillingAccountId } from "#billing/domain/billing-account.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Ids } from "#shared/application/ids.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { anyUuid } from "#shared/infrastructure/any-uuid.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  accounts,
  accountTransfers,
  accountWorkspaces,
  paymentRequirements,
} from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const utc = (stored: Date) => DateTime.fromDateUnsafe(stored);

const decodeAccount = Schema.decodeUnknownEffect(BillingAccount);

const decodeTransfer = Schema.decodeUnknownEffect(AccountTransfer);

type AccountRow = typeof accounts.$inferSelect;

const toAccount = (row: AccountRow) =>
  decodeAccount({
    createdAt: utc(row.createdAt),
    freeTier: row.freeTier,
    holder: row.holderWorkspaceId,
    id: row.id,
    partnerId: Option.fromNullOr(row.partnerId),
    payer: Option.fromNullOr(row.payerUserId),
    standalone: row.standalone,
  }).pipe(Effect.orDie);

const toAccounts = (rows: readonly AccountRow[]) =>
  Effect.all(rows.map((row) => toAccount(row)));

const first = (rows: readonly AccountRow[]) =>
  Option.match(Option.fromUndefinedOr(rows[0]), {
    onNone: () => Effect.succeedNone,
    onSome: (row) => toAccount(row).pipe(Effect.map(Option.some)),
  });

const transferOfRow = (row: typeof accountTransfers.$inferSelect) =>
  decodeTransfer({
    expiresAt: utc(row.expiresAt),
    fromAccountId: row.fromAccountId,
    id: row.id,
    offeredAt: utc(row.offeredAt),
    offeredBy: row.offeredBy,
    toUserId: row.toUserId,
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

// The two-key form of a transaction's advisory lock: the first key names
// what it guards, the second the one guarded.
const holdKey = (what: string) => `peal-server/billing/${what}`;

/**
 * BillingAccountStore in the billing schema: the accounts, which workspace
 * each holds, and the offers to hand one over. The holds are transaction
 * advisory locks.
 */
export const DrizzleBillingAccountStoreLive = Layer.effect(
  BillingAccountStore,
  Effect.gen(function* DrizzleBillingAccountStoreLive() {
    const db = yield* Drizzle;
    const client = yield* SqlClient.SqlClient;
    const ids = yield* Ids;

    const hold = (what: string, id: string) =>
      client`SELECT pg_advisory_xact_lock(hashtext(${holdKey(what)}), hashtext(${id}))`.pipe(
        Effect.mapError(failed),
        Effect.asVoid
      );

    const attached = () =>
      db
        .select({
          account: accounts,
          workspaceId: accountWorkspaces.workspaceId,
        })
        .from(accountWorkspaces)
        .innerJoin(accounts, eq(accounts.id, accountWorkspaces.accountId));

    return BillingAccountStore.of({
      accountOf: (workspaceId) =>
        attached()
          .where(eq(accountWorkspaces.workspaceId, workspaceId))
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) => first(rows.map(({ account }) => account)))
          ),
      accountsIn: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Map())
          : attached()
              .where(anyUuid(accountWorkspaces.workspaceId, workspaceIds))
              .pipe(
                Effect.mapError(failed),
                Effect.flatMap((rows) =>
                  Effect.all(
                    rows.map(({ account, workspaceId }) =>
                      toAccount(account).pipe(
                        Effect.map(
                          (found) =>
                            [
                              WorkspaceIdSchema.make(workspaceId),
                              found,
                            ] as const
                        )
                      )
                    )
                  )
                ),
                Effect.map((pairs) => new Map(pairs))
              ),
      attach: (workspaceId, accountId, at, merged) =>
        db
          .insert(accountWorkspaces)
          .values({
            accountId,
            attachedAt: date(at),
            merged: merged !== undefined,
            mergedFromPayer: merged?.fromPayer.pipe(Option.getOrNull) ?? null,
            workspaceId,
          })
          .onConflictDoUpdate({
            set: {
              accountId,
              attachedAt: date(at),
              merged: merged !== undefined,
              mergedFromPayer: merged?.fromPayer.pipe(Option.getOrNull) ?? null,
            },
            target: accountWorkspaces.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      create: (account) =>
        db
          .insert(accounts)
          .values({
            createdAt: date(account.createdAt),
            freeTier: account.freeTier,
            holderWorkspaceId: account.holder,
            id: account.id,
            partnerId: Option.getOrNull(account.partnerId),
            payerUserId: Option.getOrNull(account.payer),
            standalone: account.standalone,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      delete: (accountId) =>
        Effect.gen(function* deleteAccount() {
          yield* db
            .delete(accountTransfers)
            .where(eq(accountTransfers.fromAccountId, accountId))
            .pipe(Effect.mapError(failed));
          yield* db
            .delete(accountWorkspaces)
            .where(eq(accountWorkspaces.accountId, accountId))
            .pipe(Effect.mapError(failed));
          yield* db
            .delete(accounts)
            .where(eq(accounts.id, accountId))
            .pipe(Effect.mapError(failed));
        }),
      deleteTransfer: (transferId) =>
        db
          .delete(accountTransfers)
          .where(eq(accountTransfers.id, transferId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      deleteTransfersFor: (userId) =>
        db
          .delete(accountTransfers)
          .where(
            or(
              eq(accountTransfers.toUserId, userId),
              eq(accountTransfers.offeredBy, userId)
            )
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      deleteTransfersOf: (workspaceId) =>
        db
          .delete(accountTransfers)
          .where(eq(accountTransfers.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      detach: (workspaceId) =>
        db
          .delete(accountWorkspaces)
          .where(eq(accountWorkspaces.workspaceId, workspaceId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      get: (accountId) =>
        db
          .select()
          .from(accounts)
          .where(eq(accounts.id, accountId))
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(first)),
      holdAccount: (accountId) => hold("account", accountId),
      holdPartner: (partnerId) => hold("partner-account", partnerId),
      holdPayer: (userId) => hold("payer", userId),
      mergedFrom: (workspaceId) =>
        db
          .select({ payer: accountWorkspaces.mergedFromPayer })
          .from(accountWorkspaces)
          .where(
            and(
              eq(accountWorkspaces.workspaceId, workspaceId),
              eq(accountWorkspaces.merged, true)
            )
          )
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) =>
              Option.fromNullishOr(row?.payer).pipe(
                Option.map((payer) => UserIdSchema.make(payer))
              )
            )
          ),
      mergedIn: (workspaceIds) =>
        workspaceIds.length === 0
          ? Effect.succeed(new Set())
          : db
              .select({ workspaceId: accountWorkspaces.workspaceId })
              .from(accountWorkspaces)
              .where(
                and(
                  anyUuid(accountWorkspaces.workspaceId, workspaceIds),
                  eq(accountWorkspaces.merged, true)
                )
              )
              .pipe(
                Effect.mapError(failed),
                Effect.map(
                  (rows) =>
                    new Set(
                      rows.map(({ workspaceId }) =>
                        WorkspaceIdSchema.make(workspaceId)
                      )
                    )
                )
              ),
      ofPartner: (partnerId) =>
        db
          .select()
          .from(accounts)
          .where(eq(accounts.partnerId, partnerId))
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(first)),
      offer: (transfer) =>
        db
          .insert(accountTransfers)
          .values({
            expiresAt: date(transfer.expiresAt),
            fromAccountId: transfer.fromAccountId,
            id: transfer.id,
            offeredAt: date(transfer.offeredAt),
            offeredBy: transfer.offeredBy,
            toUserId: transfer.toUserId,
            workspaceId: transfer.workspaceId,
          })
          .onConflictDoUpdate({
            set: {
              expiresAt: date(transfer.expiresAt),
              fromAccountId: transfer.fromAccountId,
              id: transfer.id,
              offeredAt: date(transfer.offeredAt),
              offeredBy: transfer.offeredBy,
              toUserId: transfer.toUserId,
            },
            target: accountTransfers.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      page: (after, limit) =>
        db
          .select()
          .from(accounts)
          .where(
            Option.isSome(after) ? gt(accounts.id, after.value) : sql`true`
          )
          .orderBy(asc(accounts.id))
          .limit(limit)
          .pipe(Effect.mapError(failed), Effect.flatMap(toAccounts)),
      paidBy: (userId) =>
        db
          .select()
          .from(accounts)
          .where(eq(accounts.payerUserId, userId))
          .pipe(Effect.mapError(failed), Effect.flatMap(toAccounts)),
      personalOf: (userId) =>
        db
          .select()
          .from(accounts)
          .where(
            and(
              eq(accounts.payerUserId, userId),
              eq(accounts.standalone, false)
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed), Effect.flatMap(first)),
      purgeLapsedTransfers: (now) =>
        db
          .delete(accountTransfers)
          .where(lte(accountTransfers.expiresAt, date(now)))
          .returning({ id: accountTransfers.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
      purgePayments: (before) =>
        db
          .delete(paymentRequirements)
          .where(lt(paymentRequirements.forgottenAt, date(before)))
          .returning({ id: paymentRequirements.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length)
          ),
      releasePayment: (userId, pseudonym) =>
        db
          .delete(paymentRequirements)
          .where(
            Option.match(pseudonym, {
              onNone: () => eq(paymentRequirements.userId, userId),
              onSome: (keyed) =>
                or(
                  eq(paymentRequirements.userId, userId),
                  eq(paymentRequirements.userPseudonym, keyed)
                ),
            })
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
      rememberPayment: (userId, pseudonym, at) =>
        db
          .update(paymentRequirements)
          .set({
            forgottenAt: date(at),
            userId: null,
            userPseudonym: pseudonym,
          })
          .where(eq(paymentRequirements.userId, userId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      requirePayment: (userId, at) =>
        ids.next.pipe(
          Effect.flatMap((id) =>
            db
              .insert(paymentRequirements)
              .values({ id, requiredAt: date(at), userId })
              .onConflictDoNothing({ target: paymentRequirements.userId })
              .pipe(Effect.mapError(failed), Effect.asVoid)
          )
        ),
      requiresPayment: (userId, pseudonym) =>
        db
          .select({ id: paymentRequirements.id })
          .from(paymentRequirements)
          .where(
            Option.match(pseudonym, {
              onNone: () => eq(paymentRequirements.userId, userId),
              onSome: (keyed) =>
                or(
                  eq(paymentRequirements.userId, userId),
                  eq(paymentRequirements.userPseudonym, keyed)
                ),
            })
          )
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      setFreeTier: (accountId, freeTier) =>
        db
          .update(accounts)
          .set({ freeTier })
          .where(eq(accounts.id, accountId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      setHolder: (accountId, holder) =>
        db
          .update(accounts)
          .set({ holderWorkspaceId: holder })
          .where(eq(accounts.id, accountId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      transferOf: (workspaceId) =>
        db
          .select()
          .from(accountTransfers)
          .where(eq(accountTransfers.workspaceId, workspaceId))
          .limit(1)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(([row]) =>
              row === undefined
                ? Effect.succeedNone
                : transferOfRow(row).pipe(Effect.map(Option.some))
            )
          ),
      transfersFor: (userId) =>
        db
          .select()
          .from(accountTransfers)
          .where(
            or(
              eq(accountTransfers.toUserId, userId),
              eq(accountTransfers.offeredBy, userId)
            )
          )
          .orderBy(asc(accountTransfers.offeredAt))
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap((rows) =>
              Effect.all(rows.map((row) => transferOfRow(row)))
            )
          ),
      workspacesOf: (accountId) =>
        db
          .select({ workspaceId: accountWorkspaces.workspaceId })
          .from(accountWorkspaces)
          .where(eq(accountWorkspaces.accountId, accountId))
          .orderBy(accountWorkspaces.workspaceId)
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) =>
              rows.map(({ workspaceId }) => WorkspaceIdSchema.make(workspaceId))
            )
          ),
      workspacesOfEach: (accountIds) =>
        accountIds.length === 0
          ? Effect.succeed(new Map())
          : db
              .select({
                accountId: accountWorkspaces.accountId,
                workspaceId: accountWorkspaces.workspaceId,
              })
              .from(accountWorkspaces)
              .where(anyUuid(accountWorkspaces.accountId, accountIds))
              .orderBy(accountWorkspaces.workspaceId)
              .pipe(
                Effect.mapError(failed),
                Effect.map((rows) => {
                  const byAccount = new Map<BillingAccountId, WorkspaceId[]>();

                  for (const row of rows) {
                    const accountId = BillingAccountIdSchema.make(
                      row.accountId
                    );

                    const held = byAccount.get(accountId) ?? [];

                    held.push(WorkspaceIdSchema.make(row.workspaceId));
                    byAccount.set(accountId, held);
                  }

                  return byAccount;
                })
              ),
    });
  })
);
