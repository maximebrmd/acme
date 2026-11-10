import { Context, Effect, Layer } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

/**
 * The names members go by, for the comments and decisions that show who
 * made them. A member who is gone has none.
 */
export class MemberNames extends Context.Service<
  MemberNames,
  {
    readonly of: (
      userIds: readonly UserId[]
    ) => Effect.Effect<ReadonlyMap<UserId, string>>;
  }
>()("peal-server/review/application/MemberNames") {
  static readonly none = Layer.succeed(
    MemberNames,
    MemberNames.of({ of: () => Effect.succeed(new Map()) })
  );
}
