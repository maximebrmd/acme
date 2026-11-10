import { Context, Effect, Layer } from "effect";

import type { VisitorContact } from "./comment-store.ts";

/**
 * Tells a visitor who asked that someone answered in their thread, by
 * email, in the language they read the page in. The email holds no link and
 * nothing of the post or the answer: a link's token is not kept, and what
 * was said stays behind the link. It goes out after the request answered,
 * and a failure is logged, not retried.
 */
export class VisitorMail extends Context.Service<
  VisitorMail,
  {
    readonly replied: (
      contacts: readonly VisitorContact[]
    ) => Effect.Effect<void>;
  }
>()("peal-server/review/application/VisitorMail") {
  static readonly none = Layer.succeed(
    VisitorMail,
    VisitorMail.of({ replied: () => Effect.void })
  );
}
