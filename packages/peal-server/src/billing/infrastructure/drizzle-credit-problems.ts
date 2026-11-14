import { and, desc, eq, isNull } from "drizzle-orm";
import { DateTime, Effect, Layer, Option, Schema } from "effect";

import { CreditProblems } from "#billing/application/ports/credit-problems.ts";
import type { CreditProblem } from "#billing/application/ports/credit-problems.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { creditProblems } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const decodeKind = Schema.decodeUnknownEffect(
  Schema.Literals(["creditRefused", "refundFailed"])
);

const decodeWorkspace = Schema.decodeUnknownOption(WorkspaceIdSchema);

const instantOf = (value: Date | null) =>
  Option.fromNullOr(value).pipe(
    Option.map((at) => DateTime.fromDateUnsafe(at))
  );

const problemOf = (row: typeof creditProblems.$inferSelect) =>
  decodeKind(row.kind).pipe(
    Effect.orDie,
    Effect.map((kind): CreditProblem => ({
      amount: row.amount,
      code: Option.fromNullOr(row.code),
      currency: row.currency,
      key: row.key,
      kind,
      occurredAt: DateTime.fromDateUnsafe(row.occurredAt),
      reason: Option.fromNullOr(row.reason),
      refundId: Option.fromNullOr(row.refundId),
      settledAt: instantOf(row.settledAt),
      stripeSubscriptionId: Option.fromNullOr(row.stripeSubscriptionId),
      workspaceId: Option.fromNullOr(row.workspaceId).pipe(
        Option.flatMap(decodeWorkspace)
      ),
    }))
  );

/** The credit problems in `billing.credit_problems`. */
export const DrizzleCreditProblemsLive = Layer.effect(
  CreditProblems,
  Effect.gen(function* DrizzleCreditProblemsLive() {
    const db = yield* Drizzle;

    return CreditProblems.of({
      find: Effect.fn("CreditProblems.find")(function* find(key) {
        const [row] = yield* db
          .select()
          .from(creditProblems)
          .where(eq(creditProblems.key, key))
          .pipe(Effect.mapError(failed));

        return row === undefined
          ? Option.none()
          : Option.some(yield* problemOf(row));
      }),
      latest: Effect.fn("CreditProblems.latest")(function* latest(limit) {
        const rows = yield* db
          .select()
          .from(creditProblems)
          .orderBy(desc(creditProblems.occurredAt), desc(creditProblems.key))
          .limit(limit)
          .pipe(Effect.mapError(failed));

        return yield* Effect.all(rows.map(problemOf));
      }),
      record: Effect.fn("CreditProblems.record")(function* record(problem) {
        const written = yield* db
          .insert(creditProblems)
          .values({
            amount: problem.amount,
            code: Option.getOrNull(problem.code),
            currency: problem.currency,
            key: problem.key,
            kind: problem.kind,
            occurredAt: DateTime.toDateUtc(problem.occurredAt),
            reason: Option.getOrNull(problem.reason),
            refundId: Option.getOrNull(problem.refundId),
            stripeSubscriptionId: Option.getOrNull(
              problem.stripeSubscriptionId
            ),
            workspaceId: Option.getOrNull(problem.workspaceId),
          })
          .onConflictDoNothing()
          .returning({ key: creditProblems.key })
          .pipe(Effect.mapError(failed));

        return written.length > 0;
      }),
      settle: (key, at) =>
        db
          .update(creditProblems)
          .set({ settledAt: DateTime.toDateUtc(at) })
          .where(
            and(eq(creditProblems.key, key), isNull(creditProblems.settledAt))
          )
          .pipe(Effect.mapError(failed), Effect.asVoid),
    });
  })
);
