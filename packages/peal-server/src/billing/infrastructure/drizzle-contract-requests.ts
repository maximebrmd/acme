import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { ContractRequests } from "#billing/application/ports/contract-requests.ts";
import { ContractRequest } from "#billing/domain/contract-request.ts";
import type { ContractRequestId } from "#billing/domain/contract-request.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { contractRequests } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const dateOf = (instant: Option.Option<DateTime.Utc>) =>
  instant.pipe(Option.map(date), Option.getOrNull);

const instantOf = (value: Date | null) =>
  Option.fromNullOr(value).pipe(
    Option.map((found) => DateTime.fromDateUnsafe(found))
  );

type Row = typeof contractRequests.$inferSelect;

const decodeRequest = Schema.decodeUnknownEffect(ContractRequest);

// A stored request, read through its schema: a row that does not decode is
// a bug.
const requestOf = (row: Row) =>
  decodeRequest({
    acknowledgedAt: instantOf(row.acknowledgedAt),
    acknowledgement: row.acknowledgement,
    channel: row.channel,
    contract: Option.fromNullOr(row.contract),
    desiredAt: instantOf(row.desiredAt),
    effectiveAt: instantOf(row.effectiveAt),
    email: Option.fromNullOr(row.email),
    id: row.id,
    kind: row.kind,
    locale: row.locale,
    name: Option.fromNullOr(row.name),
    receivedAt: DateTime.fromDateUnsafe(row.receivedAt),
    refunded:
      row.refunded === null || row.currency === null
        ? Option.none()
        : Option.some({ amount: row.refunded, currency: row.currency }),
    refusal: Option.fromNullOr(row.refusal),
    settledAt: instantOf(row.settledAt),
    status: row.status,
    stripeSubscriptionId: Option.fromNullOr(row.stripeSubscriptionId),
    userId: Option.fromNullOr(row.userId),
    workspaceId: Option.fromNullOr(row.workspaceId),
  }).pipe(Effect.orDie);

const valuesOf = (request: ContractRequest) => ({
  acknowledgedAt: dateOf(request.acknowledgedAt),
  acknowledgement: request.acknowledgement,
  channel: request.channel,
  contract: Option.getOrNull(request.contract),
  currency: request.refunded.pipe(
    Option.map(({ currency }) => currency),
    Option.getOrNull
  ),
  desiredAt: dateOf(request.desiredAt),
  effectiveAt: dateOf(request.effectiveAt),
  email: Option.getOrNull(request.email),
  kind: request.kind,
  locale: request.locale,
  name: Option.getOrNull(request.name),
  receivedAt: date(request.receivedAt),
  refunded: request.refunded.pipe(
    Option.map(({ amount }) => amount),
    Option.getOrNull
  ),
  refusal: Option.getOrNull(request.refusal),
  settledAt: dateOf(request.settledAt),
  status: request.status,
  stripeSubscriptionId: Option.getOrNull(request.stripeSubscriptionId),
  userId: Option.getOrNull(request.userId),
  workspaceId: Option.getOrNull(request.workspaceId),
});

const many = (rows: readonly Row[]) =>
  Effect.all(rows.map((row) => requestOf(row)));

/** Requests to cancel or withdraw, in the billing schema. */
export const DrizzleContractRequestsLive = Layer.effect(
  ContractRequests,
  Effect.gen(function* DrizzleContractRequestsLive() {
    const db = yield* Drizzle;

    const save = (request: ContractRequest) => {
      const values = valuesOf(request);

      return db
        .insert(contractRequests)
        .values({ ...values, id: request.id })
        .onConflictDoUpdate({ set: values, target: contractRequests.id })
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("ContractRequests.save")
        );
    };

    const byId = (id: ContractRequestId) =>
      db
        .select()
        .from(contractRequests)
        .where(eq(contractRequests.id, id))
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(([row]) =>
            row === undefined
              ? Effect.succeed(Option.none<ContractRequest>())
              : requestOf(row).pipe(Effect.map(Option.some))
          ),
          Effect.withSpan("ContractRequests.byId")
        );

    const byConfirmation = (digest: string, now: DateTime.Utc) =>
      db
        .select()
        .from(contractRequests)
        .where(
          and(
            eq(contractRequests.confirmationDigest, digest),
            eq(contractRequests.status, "awaitingConfirmation"),
            gt(contractRequests.confirmationExpiresAt, date(now))
          )
        )
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(([row]) =>
            row === undefined
              ? Effect.succeed(Option.none<ContractRequest>())
              : requestOf(row).pipe(Effect.map(Option.some))
          ),
          Effect.withSpan("ContractRequests.byConfirmation")
        );

    const setConfirmation = (
      id: ContractRequestId,
      digest: string,
      expiresAt: DateTime.Utc
    ) =>
      db
        .update(contractRequests)
        .set({
          confirmationDigest: digest,
          confirmationExpiresAt: date(expiresAt),
        })
        .where(eq(contractRequests.id, id))
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("ContractRequests.setConfirmation")
        );

    const acknowledgedTo = (email: string, since: DateTime.Utc) =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(contractRequests)
        .where(
          and(
            eq(contractRequests.email, email),
            gte(contractRequests.acknowledgedAt, date(since))
          )
        )
        .pipe(
          Effect.mapError(failed),
          Effect.map(([row]) => row?.count ?? 0),
          Effect.withSpan("ContractRequests.acknowledgedTo")
        );

    const pending = (before: DateTime.Utc, limit: number) =>
      db
        .select()
        .from(contractRequests)
        .where(
          and(
            eq(contractRequests.acknowledgement, "pending"),
            lt(contractRequests.receivedAt, date(before))
          )
        )
        .orderBy(asc(contractRequests.receivedAt), asc(contractRequests.id))
        .limit(limit)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(many),
          Effect.withSpan("ContractRequests.pending")
        );

    const open = (limit: number) =>
      db
        .select()
        .from(contractRequests)
        .where(
          inArray(contractRequests.status, [
            "awaitingConfirmation",
            "unmatched",
          ])
        )
        .orderBy(asc(contractRequests.receivedAt), asc(contractRequests.id))
        .limit(limit)
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(many),
          Effect.withSpan("ContractRequests.open")
        );

    const ofUser = (userId: UserId) =>
      db
        .select()
        .from(contractRequests)
        .where(eq(contractRequests.userId, userId))
        .orderBy(asc(contractRequests.receivedAt), asc(contractRequests.id))
        .pipe(
          Effect.mapError(failed),
          Effect.flatMap(many),
          Effect.withSpan("ContractRequests.ofUser")
        );

    const eraseWorkspace = (workspaceId: WorkspaceId) =>
      DateTime.now.pipe(
        Effect.flatMap((now) =>
          db
            .update(contractRequests)
            .set({
              confirmationDigest: null,
              erasedAt: date(now),
              workspaceId: null,
            })
            .where(eq(contractRequests.workspaceId, workspaceId))
        ),
        Effect.mapError(failed),
        Effect.asVoid,
        Effect.withSpan("ContractRequests.eraseWorkspace")
      );

    const forgetUser = (userId: UserId) =>
      db
        .update(contractRequests)
        .set({
          confirmationDigest: null,
          email: null,
          name: null,
          userId: null,
        })
        .where(eq(contractRequests.userId, userId))
        .pipe(
          Effect.mapError(failed),
          Effect.asVoid,
          Effect.withSpan("ContractRequests.forgetUser")
        );

    const purge = (before: DateTime.Utc) =>
      db
        .delete(contractRequests)
        .where(
          or(
            lt(contractRequests.erasedAt, date(before)),
            and(
              isNull(contractRequests.workspaceId),
              isNull(contractRequests.erasedAt),
              lt(contractRequests.receivedAt, date(before))
            )
          )
        )
        .returning({ id: contractRequests.id })
        .pipe(
          Effect.mapError(failed),
          Effect.map((rows) => rows.length),
          Effect.withSpan("ContractRequests.purge")
        );

    return ContractRequests.of({
      acknowledgedTo,
      byConfirmation,
      byId,
      eraseWorkspace,
      forgetUser,
      ofUser,
      open,
      pending,
      purge,
      save,
      setConfirmation,
    });
  })
);
