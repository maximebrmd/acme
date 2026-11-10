import { Effect, Schema } from "effect";
import { HttpClientResponse } from "effect/http";

const objectOf = HttpClientResponse.schemaBodyJson(
  Schema.Record(Schema.String, Schema.Unknown)
);

/**
 * Whether a refusal comes from the platform itself: its body is a JSON
 * object, as every platform's API answers an error. A proxy, a gateway or
 * a captive page on the way answers HTML, or nothing: such a 401 or 403
 * must never mark a channel's token refused, which stops its publishing
 * until a member reconnects it. Read the platform's own error with its
 * schema where its fields matter.
 */
export const isJsonRefusal = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<boolean> =>
  objectOf(response).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false)
  );
