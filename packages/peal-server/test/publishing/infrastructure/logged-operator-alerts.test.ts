import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Layer, Logger, Metric, References } from "effect";
import { TestClock } from "effect/testing";

import { OperatorAlerts } from "#publishing/application/operator-alerts.ts";
import {
  alertPeriod,
  appRefusals,
  appRefusedEvent,
  LoggedOperatorAlerts,
} from "#publishing/infrastructure/logged-operator-alerts.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";

const channel = (last: number) =>
  ChannelIdSchema.make(`00000000-0000-7000-8000-00000000000${last}`);

interface Logged {
  readonly code: unknown;
  readonly event: unknown;
  readonly level: string;
}

// The logs written while `effect` runs, with their annotations.
const logsOf = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
  const logs: Logged[] = [];

  const capture = Logger.layer([
    Logger.make(({ fiber, logLevel }) => {
      const annotations = fiber.getRef(References.CurrentLogAnnotations);

      logs.push({
        code: annotations["code"],
        event: annotations["event.name"],
        level: logLevel,
      });
    }),
  ]);

  return effect.pipe(Effect.provide(capture), Effect.as(logs));
};

const refusedTimes = (code: string, times: number) =>
  OperatorAlerts.use((alerts) =>
    Effect.forEach(
      Array.from({ length: times }, (_, index) => channel(index % 9)),
      (channelId) => alerts.appRefused({ channelId, code }),
      { discard: true }
    )
  );

const countOf = (code: string) =>
  Metric.value(Metric.withAttributes(appRefusals, { code })).pipe(
    Effect.map(({ count }) => count)
  );

describe("the operator alerts in the logs", () => {
  it.effect(
    "tells the operator at the first refusal, then once a period, however many posts are refused",
    () =>
      Effect.gen(function* oncePerPeriod() {
        const before = yield* countOf("creditsDepleted");

        const logs = yield* logsOf(
          Effect.gen(function* refusals() {
            // 500 posts refused together, and again half an hour later.
            yield* refusedTimes("creditsDepleted", 500);
            yield* TestClock.adjust(Duration.minutes(30));
            yield* refusedTimes("creditsDepleted", 500);

            // Still refused once the period has passed: told again, once.
            yield* TestClock.adjust(Duration.minutes(30));
            yield* refusedTimes("creditsDepleted", 500);
          })
        );

        assert.deepStrictEqual(logs, [
          { code: "creditsDepleted", event: appRefusedEvent, level: "Error" },
          { code: "creditsDepleted", event: appRefusedEvent, level: "Error" },
        ]);
        assert.isTrue(
          Duration.isGreaterThanOrEqualTo(alertPeriod, Duration.hours(1))
        );

        // Every refused attempt is counted, told or not.
        assert.strictEqual((yield* countOf("creditsDepleted")) - before, 1500);
      }).pipe(Effect.provide(Layer.fresh(LoggedOperatorAlerts)))
  );

  it.effect("tells each kind of refusal on its own", () =>
    Effect.gen(function* perCode() {
      const logs = yield* logsOf(
        Effect.gen(function* refusals() {
          yield* refusedTimes("creditsDepleted", 3);
          yield* refusedTimes("usageCapped", 3);
        })
      );

      assert.deepStrictEqual(
        logs.map(({ code }) => code),
        ["creditsDepleted", "usageCapped"]
      );
    }).pipe(Effect.provide(Layer.fresh(LoggedOperatorAlerts)))
  );
});
