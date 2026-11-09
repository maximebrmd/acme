import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { LegalSubject } from "#legal/domain/legal-subject.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { UserId } from "#shared/domain/ids.ts";

/** A legal request answered, as other staff see it. */
export interface AnsweredRequest {
  readonly at: DateTime.Utc;
  readonly authority: string;
  readonly reference: string;
  readonly staffId: UserId;
  readonly subject: LegalSubject;
}

/**
 * Where each answer to a legal request shows to the rest of staff, so
 * someone else reviews it: the staff context's audit log.
 */
export class DisclosureReview extends Context.Service<
  DisclosureReview,
  {
    readonly answered: (
      request: AnsweredRequest
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/legal/application/DisclosureReview") {}
