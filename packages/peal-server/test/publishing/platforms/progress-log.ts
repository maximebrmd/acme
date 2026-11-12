import { isDeepStrictEqual } from "node:util";

import { Context, Effect, Layer, Option, Ref } from "effect";
import type { Schema } from "effect";

import { PublicationProgress } from "#publishing/application/publication-progress.ts";
import type { CallProgress } from "#publishing/application/publication-progress.ts";

/**
 * The journal's progress in memory, for calls the test begins: what each
 * recorded, in order, and what it holds now.
 */
export class ProgressLog extends Context.Service<
  ProgressLog,
  {
    /** Begins a call under the key, with what an earlier run recorded. */
    readonly begin: (
      idempotencyKey: string,
      recorded?: typeof Schema.Json.Type
    ) => Effect.Effect<void>;
    /** Everything recorded under the key, in order. */
    readonly recorded: (
      idempotencyKey: string
    ) => Effect.Effect<readonly (typeof Schema.Json.Type)[]>;
  }
>()("peal-server/test/publishing/ProgressLog") {}

export const progressInMemory = Layer.effectContext(
  Effect.gen(function* building() {
    const calls = yield* Ref.make(
      new Map<string, readonly (typeof Schema.Json.Type)[]>()
    );

    const progress = PublicationProgress.of({
      read: (idempotencyKey) =>
        Ref.get(calls).pipe(
          Effect.map((known): CallProgress => {
            const steps = known.get(idempotencyKey);

            return steps === undefined
              ? { _tag: "unknownCall" }
              : {
                  _tag: "begun",
                  recorded: Option.fromUndefinedOr(steps.at(-1)),
                };
          })
        ),
      record: (idempotencyKey, step) =>
        Ref.modify(calls, (known) => {
          const steps = known.get(idempotencyKey);

          return steps === undefined
            ? [false, known]
            : [true, new Map(known).set(idempotencyKey, [...steps, step])];
        }).pipe(
          Effect.flatMap((found) =>
            found ? Effect.void : Effect.die("No call has this key")
          )
        ),
      replace: (idempotencyKey, expected, step) =>
        Ref.modify(calls, (known) => {
          const steps = known.get(idempotencyKey);
          const last = steps?.at(-1);

          const holds =
            steps !== undefined &&
            Option.match(expected, {
              onNone: () => last === undefined,
              onSome: (value) =>
                last !== undefined && isDeepStrictEqual(last, value),
            });

          return holds
            ? [true, new Map(known).set(idempotencyKey, [...steps, step])]
            : [false, known];
        }),
    });

    const log = ProgressLog.of({
      begin: (idempotencyKey, recorded) =>
        Ref.update(calls, (known) =>
          new Map(known).set(
            idempotencyKey,
            recorded === undefined ? [] : [recorded]
          )
        ),
      recorded: (idempotencyKey) =>
        Ref.get(calls).pipe(
          Effect.map((known) => known.get(idempotencyKey) ?? [])
        ),
    });

    return Context.make(PublicationProgress, progress).pipe(
      Context.add(ProgressLog, log)
    );
  })
);
