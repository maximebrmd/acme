import { Context, Effect, Layer } from "effect";

import type { CommentRule } from "#engagement/domain/comment-rule.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";

/** Who a rule's starter is now: acting, gone, or locked out for now. */
export type CommentRuleStarter =
  | { readonly _tag: "acting"; readonly actor: Actor }
  | { readonly _tag: "gone" }
  | { readonly _tag: "lockedOut" };

/**
 * The actor a comment rule answers as: whoever started it, as they are
 * now, never as they were.
 */
export class RuleStarters extends Context.Service<
  RuleStarters,
  {
    readonly of: (
      rule: CommentRule
    ) => Effect.Effect<CommentRuleStarter, DatabaseError>;
  }
>()("peal-server/engagement/application/RuleStarters") {
  /** For tests that run no rule: every starter is gone. */
  static readonly none = Layer.succeed(
    RuleStarters,
    RuleStarters.of({ of: () => Effect.succeed({ _tag: "gone" }) })
  );
}
