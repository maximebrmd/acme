import { Config, Duration, Effect, Layer, Schema } from "effect";

import {
  CurrentSweepPolicy,
  defaultSweepPolicy,
  minimumSweepAge,
} from "#media/application/sweep-policy.ts";
import type { SweepPolicy } from "#media/application/sweep-policy.ts";
import { isProduction } from "#shared/infrastructure/environment.ts";

// The sweeps of the media store, from the environment, read when the
// server starts: a value that does not read, or an age under the part
// URLs' six hours and an hour, stops it there.
//
// | Variable                       | Meaning                                       |
// | ------------------------------ | --------------------------------------------- |
// | PEAL_MEDIA_SWEEPS              | on or off: on in production, off elsewhere    |
// | PEAL_MEDIA_SWEEP_ORPHANS_LIMIT | orphans a page may hold before the sweep stops |
// | PEAL_MEDIA_SWEEP_PENDING_LIMIT | uploads never completed a run may find, at most |
// | PEAL_MEDIA_SWEEP_PENDING_AFTER | an upload never completed goes after this     |
// | PEAL_MEDIA_SWEEP_UPLOADS_AFTER | a multipart upload left open goes after this  |
// | PEAL_MEDIA_SWEEP_ORPHANS_AFTER | a file no asset holds goes once this old      |
// | PEAL_MEDIA_SWEEP_BATCH         | the most each sweep deletes a run (1–10,000)  |

/** The most a run may be told to delete. */
export const maxSweepBatch = 10_000;

const AgeSchema = Schema.DurationFromString.check(
  Schema.makeFilter(
    (age: Duration.Duration) =>
      (Duration.isFinite(age) &&
        Duration.isGreaterThanOrEqualTo(age, minimumSweepAge)) ||
      `must be a finite duration of at least ${Duration.format(minimumSweepAge)}: set PEAL_MEDIA_SWEEPS=off for none`
  )
);

const age = (name: string, fallback: Duration.Duration) =>
  Config.schema(AgeSchema, name).pipe(Config.withDefault(fallback));

export const sweepPolicyConfig: Config.Config<SweepPolicy> = Config.all({
  enabled: isProduction.pipe(
    Config.flatMap((production) =>
      Config.Literals(["on", "off"], "PEAL_MEDIA_SWEEPS").pipe(
        Config.withDefault(production ? "on" : "off")
      )
    ),
    Config.map((switched) => switched === "on")
  ),
  pendingLimit: Config.schema(
    Schema.Int.check(Schema.isBetween({ maximum: maxSweepBatch, minimum: 1 })),
    "PEAL_MEDIA_SWEEP_PENDING_LIMIT"
  ).pipe(Config.withDefault(defaultSweepPolicy.pendingLimit)),
  orphansLimit: Config.schema(
    Schema.Int.check(Schema.isBetween({ maximum: maxSweepBatch, minimum: 1 })),
    "PEAL_MEDIA_SWEEP_ORPHANS_LIMIT"
  ).pipe(Config.withDefault(defaultSweepPolicy.orphansLimit)),
  batch: Config.schema(
    Schema.Int.check(Schema.isBetween({ maximum: maxSweepBatch, minimum: 1 })),
    "PEAL_MEDIA_SWEEP_BATCH"
  ).pipe(Config.withDefault(defaultSweepPolicy.batch)),
  orphansAfter: age(
    "PEAL_MEDIA_SWEEP_ORPHANS_AFTER",
    defaultSweepPolicy.orphansAfter
  ),
  pendingAfter: age(
    "PEAL_MEDIA_SWEEP_PENDING_AFTER",
    defaultSweepPolicy.pendingAfter
  ),
  uploadsAfter: age(
    "PEAL_MEDIA_SWEEP_UPLOADS_AFTER",
    defaultSweepPolicy.uploadsAfter
  ),
});

/** The sweep policy the settings give. */
export const SweepPolicyLive = Layer.effect(
  CurrentSweepPolicy,
  Effect.gen(function* SweepPolicyLive() {
    return yield* sweepPolicyConfig;
  })
);
