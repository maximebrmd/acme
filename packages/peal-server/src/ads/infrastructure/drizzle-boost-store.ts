import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { BoostStore } from "#ads/application/ports/boost-store.ts";
import type {
  AuditEntry,
  SpendCall,
} from "#ads/application/ports/boost-store.ts";
import { AuditActionSchema } from "#ads/domain/audit-action.ts";
import { Boost } from "#ads/domain/boost.ts";
import type { BoostState } from "#ads/domain/boost.ts";
import {
  AdAccountIdSchema,
  BoostIdSchema,
  NetworkObjectIdSchema,
  SpendCallIdSchema,
} from "#ads/domain/ids.ts";
import { SpendOutcomeSchema, SpendStepSchema } from "#ads/domain/spend-step.ts";
import { ActorSubjectSchema } from "#shared/domain/access.ts";
import type { ActorSubject } from "#shared/domain/access.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { date, dateOrNull, failed, utc, utcOrNone } from "./rows.ts";
import { auditEvents, boosts, spendCalls } from "./schema.ts";

type Row = typeof boosts.$inferSelect;

// Rows are decoded with the domain's schema, so a row the domain could not
// have written fails loudly instead of being trusted.
const decodeBoost = Schema.decodeUnknownEffect(Boost);
const decodeSubject = Schema.decodeUnknownOption(ActorSubjectSchema);

// Who a row says acted: a user (with the application acting for them) or
// a key; none once a closed account's id was cleared.
const subjectOf = (stored: {
  readonly client: string | null;
  readonly id: string | null;
  readonly kind: string | null;
}): Option.Option<ActorSubject> => {
  if (stored.id === null) {
    return Option.none();
  }

  if (stored.kind === "apiKey") {
    return decodeSubject({ _tag: "apiKey", apiKeyId: stored.id });
  }

  const user = {
    _tag: "user",
    impersonatedBy: Option.none(),
    userId: stored.id,
  };

  return decodeSubject(
    stored.client === null ? user : { ...user, clientId: stored.client }
  );
};

const subjectColumns = (subject: Option.Option<ActorSubject>) =>
  Option.match(subject, {
    onNone: () => ({ client: null, id: null, kind: null }),
    onSome: (by) =>
      by._tag === "apiKey"
        ? { client: null, id: by.apiKeyId, kind: "apiKey" }
        : { client: by.clientId ?? null, id: by.userId, kind: "user" },
  });

const stateOf = (row: Row) => {
  const at = utc(row.stateAt);

  switch (row.state) {
    case "requested": {
      return { _tag: "requested" };
    }

    case "ended":
    case "stopped": {
      return { _tag: row.state, at };
    }

    case "failed": {
      return {
        _tag: "failed",
        at,
        networkCode: Option.fromNullOr(row.failureCode),
        reason: row.failureReason,
      };
    }

    default: {
      return { _tag: row.state, since: at };
    }
  }
};

const toBoost = (row: Row) =>
  decodeBoost({
    activatedAt: utcOrNone(row.activatedAt),
    adAccountId: row.accountId,
    audience: row.audience,
    beneficiary: Option.fromNullOr(row.beneficiary),
    budget: { _tag: row.budgetKind, amount: row.budgetAmount },
    channelId: row.channelId,
    committed: row.committed,
    createdAt: utc(row.createdAt),
    currency: row.currency,
    endsAt: utc(row.endsAt),
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    objective: row.objective,
    objects: {
      adId: Option.fromNullOr(row.adId),
      adSetId: Option.fromNullOr(row.adSetId),
      campaignId: Option.fromNullOr(row.campaignId),
    },
    payer: Option.fromNullOr(row.payer),
    platform: row.platform,
    postId: row.postId,
    requestedBy: subjectOf({
      client: row.requestedByClient,
      id: row.requestedById,
      kind: row.requestedByKind,
    }),
    startsAt: utc(row.startsAt),
    state: stateOf(row),
    targetId: row.targetId,
    updatedAt: utc(row.updatedAt),
    workspaceId: row.workspaceId,
  }).pipe(Effect.orDie);

const stateAtOf = (state: BoostState, boost: Boost) => {
  switch (state._tag) {
    case "requested": {
      return boost.createdAt;
    }

    case "ended":
    case "stopped":
    case "failed": {
      return state.at;
    }

    case "active":
    case "paused":
    case "unconfirmed": {
      return state.since;
    }

    default: {
      return boost.updatedAt;
    }
  }
};

// What changes over a boost's life.
const changing = (boost: Boost) => {
  const { state } = boost;
  const failure = state._tag === "failed" ? state : undefined;

  return {
    activatedAt: dateOrNull(boost.activatedAt),
    adId: Option.getOrNull(boost.objects.adId),
    adSetId: Option.getOrNull(boost.objects.adSetId),
    campaignId: Option.getOrNull(boost.objects.campaignId),
    committed: boost.committed,
    failureCode:
      failure === undefined ? null : Option.getOrNull(failure.networkCode),
    failureReason: failure?.reason ?? null,
    state: state._tag,
    stateAt: date(stateAtOf(state, boost)),
    updatedAt: date(boost.updatedAt),
  };
};

const some = (rows: readonly Row[]) =>
  Option.match(Option.fromUndefinedOr(rows[0]), {
    onNone: () => Effect.succeed(Option.none<Boost>()),
    onSome: (row) => toBoost(row).pipe(Effect.map(Option.some)),
  });

// The states whose budget counts against a ceiling: all but `failed`.
const counted = ne(boosts.state, "failed");

// The boosts being made, running or that may run.
const open = inArray(boosts.state, ["requested", "active", "unconfirmed"]);

const decodeAmounts = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Int)
);

const toCall = (row: typeof spendCalls.$inferSelect): SpendCall => ({
  boostId: BoostIdSchema.make(row.boostId),
  finishedAt: utcOrNone(row.finishedAt),
  id: SpendCallIdSchema.make(row.id),
  networkCode: Option.fromNullOr(row.networkCode),
  objectId: Option.fromNullOr(row.objectId).pipe(
    Option.map((id) => NetworkObjectIdSchema.make(id))
  ),
  outcome: Option.fromNullOr(row.outcome).pipe(
    Option.map(Schema.decodeUnknownSync(SpendOutcomeSchema))
  ),
  startedAt: utc(row.startedAt),
  step: Schema.decodeUnknownSync(SpendStepSchema)(row.step),
});

const toEntry = (row: typeof auditEvents.$inferSelect): AuditEntry => ({
  accountId: Option.fromNullOr(row.accountId).pipe(
    Option.map((id) => AdAccountIdSchema.make(id))
  ),
  action: Schema.decodeUnknownSync(AuditActionSchema)(row.action),
  amounts: decodeAmounts(row.amounts),
  at: utc(row.at),
  boostId: Option.fromNullOr(row.boostId).pipe(
    Option.map((id) => BoostIdSchema.make(id))
  ),
  by: subjectOf({ client: row.byClient, id: row.byId, kind: row.byKind }),
  currency: Option.fromNullOr(row.currency),
  id: row.id,
  workspaceId: WorkspaceIdSchema.make(row.workspaceId),
});

/** Boosts, their journal and the audit trail, in the ads schema. */
export const DrizzleBoostStore = Layer.effect(
  BoostStore,
  Effect.gen(function* DrizzleBoostStore() {
    const db = yield* Drizzle;

    return BoostStore.of({
      audit: (entry) => {
        const by = subjectColumns(entry.by);

        return db
          .insert(auditEvents)
          .values({
            accountId: Option.getOrNull(entry.accountId),
            action: entry.action,
            amounts: entry.amounts,
            at: date(entry.at),
            boostId: Option.getOrNull(entry.boostId),
            byClient: by.client,
            byId: by.id,
            byKind: by.kind,
            currency: Option.getOrNull(entry.currency),
            id: entry.id,
            workspaceId: entry.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid);
      },
      auditTrail: (workspaceId, page) =>
        db
          .select()
          .from(auditEvents)
          .where(
            and(
              eq(auditEvents.workspaceId, workspaceId),
              page.before.pipe(
                Option.map((id) => lt(auditEvents.id, id)),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(desc(auditEvents.id))
          .limit(page.limit)
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.map(toEntry))
          ),
      beginCall: (call) =>
        db
          .insert(spendCalls)
          .values({
            boostId: call.boostId,
            id: call.id,
            startedAt: date(call.startedAt),
            step: call.step,
            workspaceId: call.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid),
      byKey: (workspaceId, idempotencyKey) =>
        db
          .select()
          .from(boosts)
          .where(
            and(
              eq(boosts.workspaceId, workspaceId),
              eq(boosts.idempotencyKey, idempotencyKey)
            )
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      calls: (boostId) =>
        db
          .select()
          .from(spendCalls)
          .where(eq(spendCalls.boostId, boostId))
          .orderBy(asc(spendCalls.id))
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.map(toCall))
          ),
      committedOn: (accountId, window, except) =>
        db
          .select({
            committed: boosts.committed,
            from: boosts.startsAt,
            to: boosts.endsAt,
          })
          .from(boosts)
          .where(
            and(
              eq(boosts.accountId, accountId),
              counted,
              // Runs that overlap the window.
              lte(boosts.startsAt, date(window.to)),
              gte(boosts.endsAt, date(window.from)),
              except.pipe(
                Option.map((id) => ne(boosts.id, id)),
                Option.getOrUndefined
              )
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) =>
              rows.map((row) => ({
                committed: row.committed,
                from: utc(row.from),
                to: utc(row.to),
              }))
            )
          ),
      dueToEnd: (now, limit) =>
        db
          .select()
          .from(boosts)
          .where(
            and(
              inArray(boosts.state, ["active", "paused", "unconfirmed"]),
              lte(boosts.endsAt, date(now))
            )
          )
          .orderBy(asc(boosts.endsAt), asc(boosts.id))
          .limit(limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toBoost))
          ),
      findIn: (workspaceId, boostId) =>
        db
          .select()
          .from(boosts)
          .where(
            and(eq(boosts.workspaceId, workspaceId), eq(boosts.id, boostId))
          )
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      finishCall: (callId, result) =>
        db
          .update(spendCalls)
          .set({
            finishedAt: date(result.finishedAt),
            networkCode: Option.getOrNull(result.networkCode),
            objectId: Option.getOrNull(result.objectId),
            outcome: result.outcome,
          })
          .where(eq(spendCalls.id, callId))
          .pipe(Effect.mapError(failed), Effect.asVoid),
      get: (boostId) =>
        db
          .select()
          .from(boosts)
          .where(eq(boosts.id, boostId))
          .pipe(Effect.mapError(failed), Effect.flatMap(some)),
      insert: (boost) => {
        const by = subjectColumns(boost.requestedBy);

        return db
          .insert(boosts)
          .values({
            ...changing(boost),
            accountId: boost.adAccountId,
            audience: Schema.encodeSync(Boost.fields.audience)(boost.audience),
            beneficiary: Option.getOrNull(boost.beneficiary),
            budgetAmount: boost.budget.amount,
            budgetKind: boost.budget._tag,
            channelId: boost.channelId,
            createdAt: date(boost.createdAt),
            currency: boost.currency,
            endsAt: date(boost.endsAt),
            id: boost.id,
            idempotencyKey: boost.idempotencyKey,
            objective: boost.objective,
            payer: Option.getOrNull(boost.payer),
            platform: boost.platform,
            postId: boost.postId,
            requestedByClient: by.client,
            requestedById: by.id,
            requestedByKind: by.kind,
            startsAt: date(boost.startsAt),
            targetId: boost.targetId,
            workspaceId: boost.workspaceId,
          })
          .pipe(Effect.mapError(failed), Effect.asVoid);
      },
      list: (workspaceId, filter) =>
        db
          .select()
          .from(boosts)
          .where(
            and(
              eq(boosts.workspaceId, workspaceId),
              filter.postId.pipe(
                Option.map((postId) => eq(boosts.postId, postId)),
                Option.getOrUndefined
              ),
              filter.before.pipe(
                Option.map((id) => lt(boosts.id, id)),
                Option.getOrUndefined
              )
            )
          )
          .orderBy(desc(boosts.id))
          .limit(filter.limit)
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toBoost))
          ),
      markBudgetReached: (boostId, now) =>
        db
          .update(boosts)
          .set({ budgetReachedAt: date(now) })
          .where(and(eq(boosts.id, boostId), isNull(boosts.budgetReachedAt)))
          .returning({ id: boosts.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
      openOn: (accountIds) =>
        accountIds.length === 0
          ? Effect.succeed(0)
          : db
              .select({ count: sql<number>`count(*)::int` })
              .from(boosts)
              .where(and(inArray(boosts.accountId, [...accountIds]), open))
              .pipe(
                Effect.mapError(failed),
                Effect.map(([row]) => row?.count ?? 0)
              ),
      outstandingOn: (accountId, except) =>
        db
          .select({
            total: sql<number>`coalesce(sum(${boosts.committed}), 0)::float8`,
          })
          .from(boosts)
          .where(
            and(
              eq(boosts.accountId, accountId),
              inArray(boosts.state, [
                "requested",
                "active",
                "paused",
                "unconfirmed",
              ]),
              except.pipe(
                Option.map((id) => ne(boosts.id, id)),
                Option.getOrUndefined
              )
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.map(([row]) => row?.total ?? 0)
          ),
      runningOn: (accountId) =>
        db
          .select()
          .from(boosts)
          .where(
            and(
              eq(boosts.accountId, accountId),
              inArray(boosts.state, ["active", "unconfirmed"])
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(Effect.forEach(toBoost))
          ),
      save: (boost, from) =>
        db
          .update(boosts)
          .set(changing(boost))
          .where(and(eq(boosts.id, boost.id), eq(boosts.state, from)))
          .returning({ id: boosts.id })
          .pipe(
            Effect.mapError(failed),
            Effect.map((rows) => rows.length > 0)
          ),
    });
  })
);
