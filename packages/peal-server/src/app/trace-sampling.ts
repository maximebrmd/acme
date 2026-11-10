import {
  Cause,
  Config,
  Duration,
  Effect,
  Exit,
  Layer,
  Option,
  Schema,
  Tracer,
} from "effect";

import { isProduction } from "#shared/infrastructure/environment.ts";

import { SampledSpan } from "./sampled-span.ts";

/**
 * The samplers OpenTelemetry's `OTEL_TRACES_SAMPLER` names. The
 * `parentbased_` ones follow the caller's decision for a request that came
 * with one, and decide for the traces that begin here.
 */
export const SamplerNameSchema = Schema.Literals([
  "always_on",
  "always_off",
  "traceidratio",
  "parentbased_always_on",
  "parentbased_always_off",
  "parentbased_traceidratio",
]);

export type SamplerName = typeof SamplerNameSchema.Type;

/**
 * The share of traces a production server samples when
 * `OTEL_TRACES_SAMPLER_ARG` is not set: one in ten. Unsampled, every
 * request, read and job exports its whole trace, which at 10,000 users is
 * most of what the telemetry stack stores.
 */
export const defaultProductionRatio = 0.1;

/**
 * How long a span lasts before it is exported whatever the sampler said: a
 * request, a job or a platform call that took this long is worth its trace.
 */
export const slowSpan = Duration.seconds(10);

/**
 * Spans sampled whatever the ratio, with everything under them: each
 * attempt to publish a post on a channel, from the journal row to the
 * platform's answer. They are few next to requests and reads, and a failed
 * or slow publish is what an operator opens a trace for.
 */
export const alwaysSampledSpans: readonly string[] = [
  "Publishing.publishAttempt",
];

/** How traces are sampled, as the settings say. */
export interface Sampler {
  /** Whether a span with a parent follows the parent's decision. */
  readonly followsParent: boolean;
  /** The share of the other traces that is sampled, from 0 to 1. */
  readonly ratio: number;
}

const samplerOf = (name: SamplerName, ratio: number): Sampler => {
  const followsParent = name.startsWith("parentbased_");

  if (name.endsWith("always_on")) {
    return { followsParent, ratio: 1 };
  }

  return { followsParent, ratio: name.endsWith("always_off") ? 0 : ratio };
};

const RatioSchema = Schema.NumberFromString.check(
  Schema.isBetween({ maximum: 1, minimum: 0 })
);

/**
 * The sampler, from OpenTelemetry's `OTEL_TRACES_SAMPLER` and
 * `OTEL_TRACES_SAMPLER_ARG`. Unset, production samples the traces that
 * begin here at `defaultProductionRatio` and follows its callers
 * (`parentbased_traceidratio`); anywhere else every trace is sampled
 * (`parentbased_always_on`). A name or a ratio it does not know stops the
 * server.
 */
export const samplerConfig: Config.Config<Sampler> = isProduction.pipe(
  Config.flatMap((production) =>
    Config.all({
      name: Config.schema(SamplerNameSchema, "OTEL_TRACES_SAMPLER").pipe(
        Config.withDefault<SamplerName>(
          production ? "parentbased_traceidratio" : "parentbased_always_on"
        )
      ),
      ratio: Config.schema(RatioSchema, "OTEL_TRACES_SAMPLER_ARG").pipe(
        Config.withDefault(production ? defaultProductionRatio : 1)
      ),
    })
  ),
  Config.map(({ name, ratio }) => samplerOf(name, ratio))
);

// A trace id is 32 hex digits, random: its last 13 (52 bits, which a
// number holds exactly) against the ratio, so every span of a trace, here
// and in any service that samples the same way, decides alike.
const idDigits = 13;

const idRange = 16 ** idDigits;

const withinRatio = (traceId: string, ratio: number): boolean => {
  if (ratio >= 1) {
    return true;
  }

  const sample = Number.parseInt(traceId.slice(-idDigits), 16);

  return Number.isFinite(sample) && sample < ratio * idRange;
};

type SpanOptions = Parameters<Tracer.Tracer["span"]>[0];

// Effect clears `sampled` for a span under an unsampled parent, and for one
// below the minimum trace level. The first is the sampler's to decide; the
// second stays off whatever it says.
const isBelowTraceLevel = ({ parent, sampled }: SpanOptions): boolean =>
  !sampled && !Option.exists(parent, (span) => !span.sampled);

const never = () => false;

const slowNanos = BigInt(Duration.toMillis(slowSpan)) * 1_000_000n;

// What is exported from a trace that was not sampled: a span that ended in
// a defect, a request the server failed (5xx), or a span that was slow. Its
// parents end the same way, or lasted as long, so the path to the root
// comes with it. An interruption is not a failure.
const worthKeeping = (
  span: Tracer.Span,
  endTime: bigint,
  exit: Exit.Exit<unknown, unknown>
): boolean => {
  if (endTime - span.status.startTime >= slowNanos) {
    return true;
  }

  if (Exit.isSuccess(exit) || Cause.hasInterruptsOnly(exit.cause)) {
    return false;
  }

  return span.kind === "server" || Cause.hasDies(exit.cause);
};

/**
 * `tracer`, sampling as `sampler` says. The decision is made when a trace
 * begins (head sampling), from its id, and every span under it follows.
 * Since that is before anyone knows how the trace ends, two things keep
 * the traces operators need, unless the sampler turns tracing off (a ratio
 * of 0 with `always_off`):
 *
 * - the spans in `alwaysSampledSpans` are sampled whatever the ratio;
 * - a span of an unsampled trace is still exported when it ended in a
 *   defect, when the server failed the request, or when it was slow
 *   (`slowSpan`), with its parents up to the root.
 *
 * Logs and metrics are not sampled: every error is logged, with its trace
 * id, and counted.
 */
export const sampledTracer = (
  tracer: Tracer.Tracer,
  sampler: Sampler,
  options: { readonly keepsUnsampled: boolean }
): Tracer.Tracer =>
  Tracer.make({
    context: tracer.context,
    span: (spanOptions) => {
      if (isBelowTraceLevel(spanOptions)) {
        return tracer.span(spanOptions);
      }

      // Built as sampled: whether it is exported is decided as it ends.
      const exported = tracer.span({ ...spanOptions, sampled: true });
      const { parent } = spanOptions;

      // A span follows the span it is under in this process. One whose
      // parent is a caller's follows it when the sampler is parent-based;
      // otherwise, as for a trace that begins here, its id decides.
      const followed =
        Option.isSome(parent) &&
        (parent.value._tag === "Span" || sampler.followsParent)
          ? parent.value.sampled
          : withinRatio(exported.traceId, sampler.ratio);

      return new SampledSpan({
        exported,
        keeps: options.keepsUnsampled ? worthKeeping : never,
        sampled:
          followed ||
          (options.keepsUnsampled &&
            alwaysSampledSpans.includes(spanOptions.name)),
      });
    },
  });

/**
 * Samples the traces of the tracer it is given, as `samplerConfig` says.
 * Without an exporter (Effect's own tracer, whose spans go nowhere), it
 * only checks the settings.
 */
export const TraceSamplingLive = Layer.effect(
  Tracer.Tracer,
  Effect.gen(function* TraceSamplingLive() {
    const sampler = yield* samplerConfig;
    const tracer = yield* Tracer.Tracer;

    const name = yield* Config.schema(
      SamplerNameSchema,
      "OTEL_TRACES_SAMPLER"
    ).pipe(Config.option);

    return tracer === Tracer.nativeTracer
      ? tracer
      : sampledTracer(tracer, sampler, {
          // `always_off` and `parentbased_always_off` mean no trace begins
          // here, kept spans included.
          keepsUnsampled: !Option.exists(name, (set) =>
            set.endsWith("always_off")
          ),
        });
  })
);
