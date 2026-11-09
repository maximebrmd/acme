import { Context, Effect, Layer, Ref } from "effect";

import { OperatorAlerts } from "#publishing/application/operator-alerts.ts";

/** What the operator was told, in order: each refusal's code. */
export class AppRefusals extends Context.Service<
  AppRefusals,
  { readonly told: Effect.Effect<readonly string[]> }
>()("test/publishing/AppRefusals") {}

/** Operator alerts that only record what they were told. */
export const RecordingOperatorAlerts = Layer.effectContext(
  Effect.gen(function* RecordingOperatorAlerts() {
    const told = yield* Ref.make<readonly string[]>([]);

    return Context.make(
      OperatorAlerts,
      OperatorAlerts.of({
        appRefused: ({ code }) => Ref.update(told, (codes) => [...codes, code]),
      })
    ).pipe(Context.add(AppRefusals, { told: Ref.get(told) }));
  })
);
