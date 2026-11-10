import { Duration, Effect, Option } from "effect";
import { Activity, DurableClock, Workflow } from "effect/workflow";

import {
  BoostGateway,
  PlaceResultSchema,
} from "#ads/application/ports/boost-gateway.ts";
import { BoostStore } from "#ads/application/ports/boost-store.ts";
import { BoostIdSchema } from "#ads/domain/ids.ts";
import type { BoostId } from "#ads/domain/ids.ts";
import { placementDelayAfter } from "#ads/domain/placement-policy.ts";

// Persisted contract: the tag, the payload, the idempotency key, the
// activity names `place/<n>` and `give-up`, the clock names `retry/<n>`,
// and the result schema. Add payload fields with a decoding default, never
// rename or remove one; for anything else, add PlaceBoostV2 beside this
// one. The payload holds the boost's id only: never an amount, an audience
// or a post.

/**
 * Places one boost, which the transaction that stored it started. One
 * execution per boost, so starting it again does nothing more.
 */
export const PlaceBoostV1 = Workflow.make("PlaceBoostV1", {
  idempotencyKey: ({ boostId }) => boostId,
  payload: { boostId: BoostIdSchema },
});

// Each attempt is its own activity, so a replay reads how it ended. The
// attempt itself is safe to make again: it reads the journal, and looks up
// whatever an earlier one may have made before it sends anything.
const attempt = (boostId: BoostId, number: number) =>
  Activity.make({
    execute: Effect.gen(function* placing() {
      const boosts = yield* BoostStore;
      const gateway = yield* BoostGateway;

      const boost = yield* boosts.get(boostId).pipe(
        // The database away for a moment: the same attempt, later.
        Effect.orElseSucceed(() => Option.none())
      );

      return Option.isNone(boost)
        ? ("retry" as const)
        : yield* gateway.place({
            accountId: boost.value.adAccountId,
            boostId,
          });
    }),
    name: `place/${number}`,
    success: PlaceResultSchema,
  });

// Through the account's gate, in turn with its other calls: never while a
// placement of the boost, which an attempt took for one to try again, may
// still be turning it on.
const giveUp = (boostId: BoostId) =>
  Activity.make({
    execute: Effect.gen(function* givingUp() {
      const boosts = yield* BoostStore;
      const gateway = yield* BoostGateway;
      const boost = yield* boosts.get(boostId).pipe(Effect.orDie);

      if (Option.isSome(boost)) {
        yield* gateway.giveUp({
          accountId: boost.value.adAccountId,
          boostId,
        });
      }
    }),
    name: "give-up",
  });

export const PlaceBoostV1Live = PlaceBoostV1.toLayer(
  Effect.fn("PlaceBoostV1")(function* placeBoost({ boostId }) {
    let number = 1;
    let result = yield* attempt(boostId, number);

    while (result === "retry") {
      const delay = placementDelayAfter(number);

      if (Option.isNone(delay)) {
        yield* giveUp(boostId);

        return;
      }

      yield* DurableClock.sleep({
        duration: delay.value,
        inMemoryThreshold: Duration.zero,
        name: `retry/${number}`,
      });

      number += 1;
      result = yield* attempt(boostId, number);
    }
  })
);
