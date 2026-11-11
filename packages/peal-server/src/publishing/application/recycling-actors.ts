import { Context, Effect, Layer } from "effect";

import type { RecyclingRule } from "#publishing/domain/recycling-rule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";

/**
 * Who a rule's starter is now: acting, with the permissions they hold
 * now; gone (a member removed or banned, a key revoked or expired, an
 * application whose grant was withdrawn, or whoever it was forgotten when
 * they closed their account); or locked out for now by something they can
 * put right, which the rule waits on.
 */
export type RuleStarter =
  | { readonly _tag: "acting"; readonly actor: Actor }
  | { readonly _tag: "gone" }
  | { readonly _tag: "lockedOut" };

/**
 * The actor a recycling rule's occurrences act as: whoever started it, as
 * they are when the occurrence is made, never as they were.
 */
export class RecyclingActors extends Context.Service<
  RecyclingActors,
  {
    readonly of: (
      rule: RecyclingRule
    ) => Effect.Effect<RuleStarter, DatabaseError>;
  }
>()("peal-server/publishing/application/RecyclingActors") {
  /** For tests that make no occurrence: every starter is gone. */
  static readonly none = Layer.succeed(
    RecyclingActors,
    RecyclingActors.of({ of: () => Effect.succeed({ _tag: "gone" }) })
  );
}
