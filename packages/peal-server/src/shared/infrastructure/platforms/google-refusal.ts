import { Effect, Option, Schema } from "effect";
import { HttpClientResponse } from "effect/http";

// What Google's APIs answer when they refuse a call, for every context
// that calls one (publishing's YouTube client, engagement's comments).

/**
 * A Google API error: `errors[].reason` names it, such as `quotaExceeded`
 * or `invalidTitle`. Messages may quote what was sent, so they are never
 * read.
 */
const GoogleErrorSchema = Schema.Struct({
  error: Schema.Struct({
    errors: Schema.optionalKey(
      Schema.Array(Schema.Struct({ reason: Schema.optionalKey(Schema.String) }))
    ),
  }),
});

/** The reason Google gave for refusing, if its answer named one. */
export const googleReasonOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<Option.Option<string>> =>
  HttpClientResponse.schemaBodyJson(GoogleErrorSchema)(response).pipe(
    Effect.map(({ error }) =>
      Option.fromUndefinedOr(
        error.errors?.find(({ reason }) => reason !== undefined)?.reason
      )
    ),
    Effect.orElseSucceed(() => Option.none<string>())
  );
