import { Duration, Option, Schema } from "effect";
import { Headers } from "effect/http";

// Meta reports how much of its rate limits an app has used in two headers,
// as percentages over a rolling hour (Graph API, "Rate Limiting"):
//
// - `X-App-Usage`: `{"call_count":28,"total_time":25,"total_cputime":25}`,
//   the app's own limit (codes 4 and 17).
// - `X-Business-Use-Case-Usage`: per Page or Instagram account, a list of
//   `{"type":"pages","call_count":100,…,"estimated_time_to_regain_access":19}`,
//   the wait in minutes when a limit is reached (codes 32, 80001, 80002).
//
// Every field is optional: Meta adds and drops fields between versions.

const percent = Schema.optionalKey(Schema.Number);

const UsageSchema = Schema.Struct({
  call_count: percent,
  total_cputime: percent,
  total_time: percent,
});

const BusinessUsageSchema = Schema.Record(
  Schema.String,
  Schema.Array(
    Schema.Struct({
      ...UsageSchema.fields,
      estimated_time_to_regain_access: Schema.optionalKey(Schema.Number),
    })
  )
);

const decodeAppUsage = Schema.decodeUnknownOption(
  Schema.fromJsonString(UsageSchema)
);

const decodeBusinessUsage = Schema.decodeUnknownOption(
  Schema.fromJsonString(BusinessUsageSchema)
);

/** How much of Meta's rate limits the app has used, from an answer. */
export interface GraphUsage {
  /** The highest of the percentages reported, 100 when a limit is hit. */
  readonly highestPercent: number;
  /** How long Meta said it will refuse calls, when it said. */
  readonly regainAccessIn: Option.Option<Duration.Duration>;
}

const highestOf = (usage: typeof UsageSchema.Type): number =>
  Math.max(
    usage.call_count ?? 0,
    usage.total_cputime ?? 0,
    usage.total_time ?? 0
  );

/**
 * What the answer's usage headers say, if it has any: the highest usage
 * reported, and the longest wait Meta gave before access comes back.
 */
export const graphUsageOf = (
  headers: Headers.Headers
): Option.Option<GraphUsage> => {
  const app = Headers.get(headers, "x-app-usage").pipe(
    Option.flatMap(decodeAppUsage)
  );

  const business = Headers.get(headers, "x-business-use-case-usage").pipe(
    Option.flatMap(decodeBusinessUsage),
    Option.map((objects) => Object.values(objects).flat())
  );

  if (Option.isNone(app) && Option.isNone(business)) {
    return Option.none();
  }

  const entries = Option.getOrElse(business, () => []);

  const waits = entries.flatMap(
    ({ estimated_time_to_regain_access: minutes }) =>
      minutes !== undefined && minutes > 0 ? [minutes] : []
  );

  return Option.some({
    highestPercent: Math.max(
      Option.match(app, { onNone: () => 0, onSome: highestOf }),
      ...entries.map(highestOf)
    ),
    regainAccessIn:
      waits.length === 0
        ? Option.none()
        : Option.some(Duration.minutes(Math.max(...waits))),
  });
};
