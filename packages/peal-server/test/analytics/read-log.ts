import { Context, Effect, Layer, Ref } from "effect";

import { MetricsReader } from "#analytics/application/metrics-reader.ts";
import type {
  MetricsBatch,
  MetricsReadFailure,
  MetricsRequest,
} from "#analytics/application/metrics-reader.ts";

/** The reads a MetricsReader stand-in was asked for. */
export class ReadLog extends Context.Service<
  ReadLog,
  {
    readonly record: (request: MetricsRequest) => Effect.Effect<void>;
    readonly requests: Effect.Effect<readonly MetricsRequest[]>;
  }
>()("test/analytics/ReadLog") {}

export const ReadLogTest = Layer.effect(
  ReadLog,
  Ref.make<readonly MetricsRequest[]>([]).pipe(
    Effect.map((requests) =>
      ReadLog.of({
        record: (request) =>
          Ref.update(requests, (before) => [...before, request]),
        requests: Ref.get(requests),
      })
    )
  )
);

/** A MetricsReader answering with `answer`, which logs each request. */
export const readerAnswering = (
  answer: (
    request: MetricsRequest
  ) => Effect.Effect<MetricsBatch, MetricsReadFailure>
) =>
  Layer.effect(
    MetricsReader,
    ReadLog.use((log) =>
      Effect.succeed(
        MetricsReader.of({
          read: (request) =>
            log.record(request).pipe(Effect.andThen(answer(request))),
        })
      )
    )
  );
