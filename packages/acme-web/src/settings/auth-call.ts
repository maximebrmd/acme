import { Effect, Option, Schema } from "effect";

import type { AuthClientError } from "#auth/errors.ts";

/** A Better Auth client call that failed, with its error code if any. */
export class AuthCallFailed extends Schema.TaggedError<AuthCallFailed>()(
  "AuthCallFailed",
  { code: Schema.optional(Schema.String), status: Schema.Number }
) {}

/** What a Better Auth client call answers: its data, or why it failed. */
export interface AuthAnswer {
  readonly data: unknown;
  readonly error: AuthClientError | null;
}

/**
 * Runs a Better Auth client call and reads its data with `schema`. A call
 * that does not answer, or answers data that does not decode, fails as an
 * unknown error.
 */
export const authCall = <S extends Schema.Top>(
  schema: S,
  call: () => Promise<AuthAnswer>
): Effect.Effect<S["Type"], AuthCallFailed, S["DecodingServices"]> =>
  Effect.tryPromise({
    catch: () => new AuthCallFailed({ status: 0 }),
    try: call,
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? Schema.decodeUnknownEffect(schema)(data).pipe(
            Effect.mapError(() => new AuthCallFailed({ status: 0 }))
          )
        : Effect.fail(
            new AuthCallFailed({
              ...Option.match(Option.fromUndefinedOr(error.code), {
                onNone: () => ({}),
                onSome: (code) => ({ code }),
              }),
              status: error.status,
            })
          )
    )
  );
