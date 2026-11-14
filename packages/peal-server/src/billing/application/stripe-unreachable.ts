import { Effect, Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * Stripe did not answer, or refused, what billing asked about the
 * workspace, such as expiring its open checkouts: nothing of it was
 * deleted, and the deletion can be tried again. `permanent` when Stripe
 * refused the request itself, which asking again will not change: a
 * person must look.
 */
export class StripeUnreachable extends Schema.TaggedError<StripeUnreachable>()(
  "StripeUnreachable",
  {
    // Stripe's error code, when it refused the request itself.
    code: Schema.optionalKey(Schema.String),
    permanent: Schema.Boolean.pipe(
      Schema.withConstructorDefault(Effect.succeed(false))
    ),
    workspaceId: WorkspaceIdSchema,
  }
) {}
