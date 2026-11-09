import { Schema } from "effect";

import { UnconfirmedReasonSchema } from "#shared/domain/publish-result.ts";

/**
 * The call that makes a post live was sent, and no answer that settles it
 * came back: the post may be live. Only the confirmation steps of
 * `./publication-steps.ts` see it; they turn it into a published or an
 * unconfirmed result.
 */
export class OutcomeUnknown extends Schema.TaggedError<OutcomeUnknown>()(
  "OutcomeUnknown",
  { reason: UnconfirmedReasonSchema }
) {}
