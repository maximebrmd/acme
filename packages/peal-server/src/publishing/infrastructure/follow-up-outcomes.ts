import { Effect, Layer } from "effect";

import { FollowUps } from "#publishing/application/follow-ups.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";

/**
 * Outcomes told through `told`, after the follow-up rules acting on a
 * target that was just published armed it (`FollowUps.arm`), in the
 * transaction that settled it: a rule then acts on the post from the
 * moment it went live. The database failing rolls the settlement back
 * with it, and the step is retried; a bug in arming is logged and never
 * stops publishing.
 */
export const armedOutcomes = <E, R>(
  told: Layer.Layer<PublicationOutcomes, E, R>
) =>
  Layer.effect(
    PublicationOutcomes,
    Effect.gen(function* ArmedPublicationOutcomes() {
      const outcomes = yield* PublicationOutcomes;
      const followUps = yield* FollowUps;

      return PublicationOutcomes.of({
        resolved: outcomes.resolved,
        settled: (target) =>
          followUps.arm(target).pipe(
            Effect.catchDefect((defect) =>
              Effect.logError("A post's follow-ups could not be armed", defect)
            ),
            Effect.andThen(outcomes.settled(target))
          ),
      });
    })
  ).pipe(Layer.provide(told));
