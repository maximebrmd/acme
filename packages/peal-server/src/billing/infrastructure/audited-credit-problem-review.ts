import { Effect, Layer } from "effect";

import { CreditProblemReview } from "#billing/application/ports/credit-problem-review.ts";
import { CreditProblemAudit } from "#staff/application/credit-problem-audit.ts";

/** Credit problems staff settle, in the staff context's audit log. */
export const AuditedCreditProblemReviewLive = Layer.effect(
  CreditProblemReview,
  Effect.gen(function* AuditedCreditProblemReviewLive() {
    const audit = yield* CreditProblemAudit;

    return CreditProblemReview.of({ settled: audit.settled });
  })
);
