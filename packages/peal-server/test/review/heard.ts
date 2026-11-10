import { Context } from "effect";
import type { Effect } from "effect";

import type { PostId } from "#shared/domain/ids.ts";

/** What publishing told whoever follows a workspace, in order. */
export class Heard extends Context.Service<
  Heard,
  {
    readonly events: Effect.Effect<
      readonly (readonly [kind: string, postId: PostId])[]
    >;
  }
>()("test/review/Heard") {}
