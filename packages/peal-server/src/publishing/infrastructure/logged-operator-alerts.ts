import { DateTime, Duration, Effect, Layer, Metric, Option, Ref } from "effect";

import { OperatorAlerts } from "#publishing/application/operator-alerts.ts";

/**
 * Attempts a platform refused because the server's app is not paid for,
 * by code (`creditsDepleted`, `usageCapped`): every one of them, whereas
 * the log below is written once a period.
 */
export const appRefusals = Metric.counter("peal.publishing.app_refusals", {
  description:
    "Publishing attempts a platform refused until the server's app is paid for",
  incremental: true,
});

/**
 * How long the operator is not told again of a refusal that goes on: the
 * posts refused meanwhile wait and are tried again every half hour, so one
 * alert covers them all.
 */
export const alertPeriod = Duration.hours(1);

/** The log's `event.name`, which the operator's alert rule matches. */
export const appRefusedEvent = "peal.app_refused";

/**
 * Tells the operator through the server's logs, at error level so it
 * reaches their alerts: at the first refused attempt, then once a period
 * for as long as attempts are refused, whatever the number of posts
 * waiting. The period is counted per code and in this process, which runs
 * every publishing job; a restart tells once more.
 */
export const LoggedOperatorAlerts = Layer.effect(
  OperatorAlerts,
  Effect.gen(function* LoggedOperatorAlerts() {
    const told = yield* Ref.make<ReadonlyMap<string, DateTime.Utc>>(new Map());

    return OperatorAlerts.of({
      appRefused: Effect.fn("OperatorAlerts.appRefused")(function* appRefused({
        channelId,
        code,
      }) {
        yield* Metric.update(Metric.withAttributes(appRefusals, { code }), 1);

        const now = yield* DateTime.now;

        const due = yield* Ref.modify(told, (last) => {
          const quietUntil = Option.fromUndefinedOr(last.get(code)).pipe(
            Option.map((at) => DateTime.addDuration(at, alertPeriod))
          );

          return Option.exists(quietUntil, (until) =>
            DateTime.isLessThan(now, until)
          )
            ? ([false, last] as const)
            : ([true, new Map(last).set(code, now)] as const);
        });

        if (due) {
          yield* Effect.logError(
            "A platform refuses this server's app until its account is paid for (on X: add credits, or raise the spending cap, in its developer console). Posts wait and are tried again every half hour, for a day after their time"
          ).pipe(
            Effect.annotateLogs({
              channelId,
              code,
              "event.name": appRefusedEvent,
            })
          );
        }
      }),
    });
  })
);
