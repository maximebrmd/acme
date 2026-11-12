import { Effect, Layer, Ref } from "effect";

import { RecyclingActors } from "#publishing/application/recycling-actors.ts";
import type { RuleStarter } from "#publishing/application/recycling-actors.ts";
import { RecyclingNotices } from "#publishing/application/recycling-notices.ts";
import type { RecyclingEndReason } from "#publishing/domain/recycling-end-reason.ts";
import type { RecyclingRule } from "#publishing/domain/recycling-rule.ts";
import { actorIn } from "#test/publishing/support.ts";

// Who a rule's starter is, as a test says, and the ends a rule told, as
// the notifications would key them. The state is the module's: tests that
// use it run one at a time, and set it first (`resetRecycling`).

/** A rule's end as it was told, with the key that names it. */
export interface ToldEnd {
  readonly key: string;
  readonly reason: RecyclingEndReason;
  readonly ruleId: string;
}

/** An editor of the rule's workspace, acting. */
const editorOf = (rule: RecyclingRule): RuleStarter => ({
  _tag: "acting",
  actor: actorIn(rule.workspaceId),
});

const starters = Ref.makeUnsafe<(rule: RecyclingRule) => RuleStarter>(editorOf);

const told = Ref.makeUnsafe<readonly ToldEnd[]>([]);

/** Each rule's starter is an editor of its workspace, and nothing was told. */
export const resetRecycling = Effect.all([
  Ref.set(starters, editorOf),
  Ref.set(told, []),
]);

/** Who every rule's starter is from now on. */
export const startersAre = (starter: (rule: RecyclingRule) => RuleStarter) =>
  Ref.set(starters, starter);

/** The ends told so far. */
export const toldEnds = Ref.get(told);

/** The ends that would be told, as `NotifiedRecyclingNotices` tells them. */
export const FakeRecycling = Layer.merge(
  Layer.succeed(
    RecyclingActors,
    RecyclingActors.of({
      of: (rule) => Ref.get(starters).pipe(Effect.map((of) => of(rule))),
    })
  ),
  Layer.succeed(
    RecyclingNotices,
    RecyclingNotices.of({
      ended: (rule, reason) =>
        reason === "completed" || reason === "stopped"
          ? Effect.void
          : Ref.update(told, (ends) => [
              ...ends,
              {
                key: `recycling:${rule.id}:ended:${String(rule.resumptions)}`,
                reason,
                ruleId: rule.id,
              },
            ]),
    })
  )
);
