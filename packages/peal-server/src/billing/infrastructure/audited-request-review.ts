import { Effect, Layer } from "effect";

import { RequestReview } from "#billing/application/ports/request-review.ts";
import { ContractRequestAudit } from "#staff/application/contract-request-audit.ts";

/** What staff do with requests, in the staff context's audit log. */
export const AuditedRequestReviewLive = Layer.effect(
  RequestReview,
  Effect.gen(function* AuditedRequestReviewLive() {
    const audit = yield* ContractRequestAudit;

    return RequestReview.of({
      handled: ({ action, ...entry }) =>
        audit.handled({
          ...entry,
          action:
            action === "apply"
              ? "applyContractRequest"
              : "closeContractRequest",
        }),
    });
  })
);
