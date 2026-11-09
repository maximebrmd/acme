import {
  and,
  eq,
  gt,
  isNotNull,
  isNull,
  lt,
  lte,
  not,
  or,
  sql,
} from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { Trials } from "#billing/application/ports/trials.ts";
import type { StartedTrial } from "#billing/application/ports/trials.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { trials } from "./schema.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

const ofEither = (userId: UserId, workspaceId: WorkspaceId) =>
  or(eq(trials.userId, userId), eq(trials.workspaceId, workspaceId));

const ofPair = (userId: UserId, workspaceId: WorkspaceId) =>
  and(eq(trials.userId, userId), eq(trials.workspaceId, workspaceId));

// Started, or held since `since` for another checkout than one of the
// same account and workspace, which a new one replaces.
const holds = (userId: UserId, workspaceId: WorkspaceId, since: DateTime.Utc) =>
  or(
    isNotNull(trials.stripeSubscriptionId),
    and(
      gt(trials.reservedAt, date(since)),
      not(ofPair(userId, workspaceId) ?? sql`false`)
    )
  );

/**
 * Trials in the billing schema, unique by account, by workspace and by
 * subscription. A hold is a row without a subscription, which those unique
 * indexes refuse a second of, so two checkouts started together cannot
 * both hold the trial; one that no subscription took in time is deleted
 * before the next hold.
 */
export const DrizzleTrialsLive = Layer.effect(
  Trials,
  Effect.gen(function* DrizzleTrialsLive() {
    const db = yield* Drizzle;

    const used = (
      userId: UserId,
      workspaceId: WorkspaceId,
      since: DateTime.Utc
    ) =>
      db
        .select({ reservedAt: trials.reservedAt })
        .from(trials)
        .where(
          and(ofEither(userId, workspaceId), holds(userId, workspaceId, since))
        )
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.map((rows) => rows.length > 0),
          Effect.withSpan("Trials.used")
        );

    const reserve = (
      userId: UserId,
      workspaceId: WorkspaceId,
      now: DateTime.Utc,
      since: DateTime.Utc
    ) =>
      Effect.gen(function* reserveTrial() {
        // Holds that ran out free the trial again, and the account's
        // earlier one for the same workspace is replaced.
        yield* db
          .delete(trials)
          .where(
            and(
              ofEither(userId, workspaceId),
              isNull(trials.stripeSubscriptionId),
              or(
                lte(trials.reservedAt, date(since)),
                ofPair(userId, workspaceId)
              )
            )
          );

        const held = yield* db
          .insert(trials)
          .values({ reservedAt: date(now), userId, workspaceId })
          .onConflictDoNothing()
          .returning({ id: trials.id });

        return held.length > 0;
      }).pipe(Effect.mapError(failed), Effect.withSpan("Trials.reserve"));

    const record = (trial: StartedTrial) =>
      Effect.gen(function* recordTrial() {
        const started = {
          plan: trial.plan,
          startedAt: date(trial.startedAt),
          stripeSubscriptionId: trial.stripeSubscriptionId,
        };

        // The hold of the account and the workspace takes the trial.
        const taken = yield* db
          .update(trials)
          .set(started)
          .where(
            and(
              eq(trials.userId, trial.userId),
              eq(trials.workspaceId, trial.workspaceId),
              or(
                isNull(trials.stripeSubscriptionId),
                eq(trials.stripeSubscriptionId, trial.stripeSubscriptionId)
              )
            )
          )
          .returning({ id: trials.id });

        if (taken.length > 0) {
          return true;
        }

        const inserted = yield* db
          .insert(trials)
          .values({
            ...started,
            reservedAt: started.startedAt,
            userId: trial.userId,
            workspaceId: trial.workspaceId,
          })
          .onConflictDoNothing()
          .returning({ id: trials.id });

        if (inserted.length > 0) {
          return true;
        }

        // Reported again after its account or its workspace was gone.
        const known = yield* db
          .select({ id: trials.id })
          .from(trials)
          .where(eq(trials.stripeSubscriptionId, trial.stripeSubscriptionId))
          .limit(1);

        return known.length > 0;
      }).pipe(Effect.mapError(failed), Effect.withSpan("Trials.record"));

    const usedByPseudonym = (pseudonym: string) =>
      db
        .select({ id: trials.id })
        .from(trials)
        .where(eq(trials.userPseudonym, pseudonym))
        .limit(1)
        .pipe(
          Effect.mapError(failed),
          Effect.map((rows) => rows.length > 0),
          Effect.withSpan("Trials.usedByPseudonym")
        );

    const forgetPseudonyms = (before: DateTime.Utc) =>
      Effect.gen(function* forgetOldPseudonyms() {
        const forgotten = yield* db
          .update(trials)
          .set({ forgottenAt: null, userPseudonym: null })
          .where(lt(trials.forgottenAt, date(before)))
          .returning({ id: trials.id });

        yield* db
          .delete(trials)
          .where(
            and(
              isNull(trials.userId),
              isNull(trials.workspaceId),
              isNull(trials.userPseudonym)
            )
          );

        return forgotten.length;
      }).pipe(
        Effect.mapError(failed),
        Effect.withSpan("Trials.forgetPseudonyms")
      );

    return Trials.of({
      forgetPseudonyms,
      record,
      reserve,
      used,
      usedByPseudonym,
    });
  })
);
