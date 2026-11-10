import { and, asc, eq, isNull, lt } from "drizzle-orm";
import { DateTime, Duration, Effect, Layer, Option, Schema } from "effect";

import { PublicationJournal } from "#publishing/application/publication-journal.ts";
import type {
  BegunCall,
  CallId,
  CallStart,
  RecordedAttempt,
} from "#publishing/application/publication-journal.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";
import {
  AttemptOutcomeSchema,
  earlierRefusalsOf,
} from "#publishing/domain/publication-policy.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import {
  postTargets,
  publicationAttempts,
  publicationCalls,
} from "./schema.ts";

// Outcomes are stored as the JSON the workflow history uses: ids and codes,
// never content.
const OutcomeJson = Schema.toCodecJson(AttemptOutcomeSchema);

const encodeOutcome = Schema.encodeEffect(OutcomeJson);

const decodeOutcome = Schema.decodeUnknownEffect(OutcomeJson);

const failed = (cause: unknown) => new DatabaseError({ cause });

const date = (instant: DateTime.Utc) => DateTime.toDateUtc(instant);

type CallRow = typeof publicationCalls.$inferSelect;

type AttemptRow = typeof publicationAttempts.$inferSelect;

const decodeTargetId = Schema.decodeUnknownEffect(PostTargetIdSchema);

const recordedAttempt = (row: AttemptRow) =>
  Effect.gen(function* decodingAttempt() {
    const attempt: RecordedAttempt = {
      attempt: row.attempt,
      finishedAt: DateTime.fromDateUnsafe(row.finishedAt),
      outcome: yield* decodeOutcome(row.detail),
      part: row.part,
      retryAfter: Option.fromNullOr(row.retryDelayMillis).pipe(
        Option.map(Duration.millis)
      ),
      round: row.round,
      startedAt: DateTime.fromDateUnsafe(row.startedAt),
      targetId: yield* decodeTargetId(row.targetId),
    };

    return attempt;
  }).pipe(Effect.orDie);

const begunCall = (row: CallRow) =>
  Effect.gen(function* decodingCall() {
    const startedAt = DateTime.fromDateUnsafe(row.startedAt);

    if (row.finishedAt === null || row.outcome === null) {
      const inFlight: BegunCall = { _tag: "inFlight", startedAt };

      return inFlight;
    }

    const completed: BegunCall = {
      _tag: "completed",
      finishedAt: DateTime.fromDateUnsafe(row.finishedAt),
      outcome: yield* decodeOutcome(row.outcome).pipe(Effect.orDie),
      startedAt,
    };

    return completed;
  });

/** The journal and the attempt history in the publishing schema. */
export const DrizzlePublicationJournal = Layer.effect(
  PublicationJournal,
  Effect.gen(function* DrizzlePublicationJournal() {
    const db = yield* Drizzle;

    const find = Effect.fn("PublicationJournal.find")(function* find(
      call: CallId
    ) {
      const [row] = yield* db
        .select()
        .from(publicationCalls)
        .where(
          and(
            eq(publicationCalls.targetId, call.targetId),
            eq(publicationCalls.round, call.round),
            eq(publicationCalls.part, call.part),
            eq(publicationCalls.attempt, call.attempt)
          )
        )
        .pipe(Effect.mapError(failed));

      return row === undefined
        ? Option.none<BegunCall>()
        : Option.some(yield* begunCall(row));
    });

    const begin = Effect.fn("PublicationJournal.begin")(function* begin(
      call: Parameters<PublicationJournal["Service"]["begin"]>[0]
    ) {
      const inserted = yield* db
        .insert(publicationCalls)
        .values({
          attempt: call.attempt,
          idempotencyKey: call.idempotencyKey,
          operation: "publish",
          part: call.part,
          round: call.round,
          startedAt: date(call.startedAt),
          targetId: call.targetId,
        })
        .onConflictDoNothing()
        .returning({ idempotencyKey: publicationCalls.idempotencyKey })
        .pipe(Effect.mapError(failed));

      if (inserted.length === 1) {
        const start: CallStart = { _tag: "started" };

        return start;
      }

      // The key, or this attempt at the part in the round, is taken: some run began the
      // call, under this key or another.
      const begun = yield* find(call);

      if (Option.isNone(begun)) {
        return yield* Effect.die("A journal row vanished after a conflict");
      }

      const start: CallStart = begun.value;

      return start;
    });

    return PublicationJournal.of({
      attemptsOf: (postId) =>
        db
          .select({ attempt: publicationAttempts })
          .from(publicationAttempts)
          .innerJoin(
            postTargets,
            eq(postTargets.id, publicationAttempts.targetId)
          )
          .where(eq(postTargets.postId, postId))
          .orderBy(
            asc(publicationAttempts.targetId),
            asc(publicationAttempts.round),
            asc(publicationAttempts.part),
            asc(publicationAttempts.attempt)
          )
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach(({ attempt }) => recordedAttempt(attempt))
            )
          ),
      begin,
      earlierRefusals: (call) =>
        db
          .select({ detail: publicationAttempts.detail })
          .from(publicationAttempts)
          .where(
            and(
              eq(publicationAttempts.targetId, call.targetId),
              eq(publicationAttempts.round, call.round),
              eq(publicationAttempts.part, call.part),
              lt(publicationAttempts.attempt, call.attempt)
            )
          )
          .pipe(
            Effect.mapError(failed),
            Effect.flatMap(
              Effect.forEach(({ detail }) =>
                decodeOutcome(detail).pipe(Effect.orDie)
              )
            ),
            Effect.map(earlierRefusalsOf)
          ),
      find,
      finish: (idempotencyKey, outcome, finishedAt) =>
        Effect.gen(function* finish() {
          const encoded = yield* encodeOutcome(outcome).pipe(Effect.orDie);

          // The first run to finish a call writes how it ended.
          yield* db
            .update(publicationCalls)
            .set({ finishedAt: date(finishedAt), outcome: encoded })
            .where(
              and(
                eq(publicationCalls.idempotencyKey, idempotencyKey),
                isNull(publicationCalls.finishedAt)
              )
            )
            .pipe(Effect.mapError(failed));
        }),
      recordAttempt: (attempt) =>
        Effect.gen(function* recordAttempt() {
          const detail = yield* encodeOutcome(attempt.outcome).pipe(
            Effect.orDie
          );

          const { decision } = attempt;

          yield* db
            .insert(publicationAttempts)
            .values({
              attempt: attempt.attempt,
              decision: decision._tag,
              detail,
              finishedAt: date(attempt.finishedAt),
              outcome: attempt.outcome._tag,
              part: attempt.part,
              retryDelayMillis:
                decision._tag === "retry"
                  ? Duration.toMillis(decision.delay)
                  : null,
              round: attempt.round,
              startedAt: date(attempt.startedAt),
              targetId: attempt.targetId,
            })
            .onConflictDoNothing()
            .pipe(Effect.mapError(failed));
        }),
    });
  })
);
